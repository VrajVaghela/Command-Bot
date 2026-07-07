import "server-only";
import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Action, Guild } from "@/server/db/schema";
import { env } from "@/lib/env";
import { type Result } from "@/lib/result";
import { withRetry } from "@/server/lib/retry";
import { logError } from "@/server/lib/logger";
import { ensureAction, recordActionAttempt } from "@/server/db/actions";
import { postToChannel } from "@/server/discord/channel-post";
import {
  sendMirrorNotification,
  type MirrorTarget,
} from "@/server/mirror/send-mirror";
import { editOriginalResponse } from "@/server/discord/followup";
import type { CommandRule } from "@/server/discord/rules";

export type ProcessReportInput = {
  interactionId: string;
  interactionToken: string;
  guildId: string;
  ackContent: string;
  rule: CommandRule;
};

/**
 * Runs one downstream action (`discord_reply` or `mirror`) through the
 * get-or-create + bounded-retry pipeline, recording every attempt. Never
 * throws — failures stay in the `actions` row for later inspection/retry
 * (`/api/mirror/retry`).
 */
async function runDownstreamAction(
  interactionId: string,
  kind: Action["kind"],
  send: () => Promise<Result<void>>,
): Promise<void> {
  const action = await ensureAction(interactionId, kind);
  if (action.status === "success") return; // already done — duplicate delivery

  const result = await withRetry(send, {
    onAttempt: (attemptNumber, attemptResult) =>
      recordActionAttempt(action.id, {
        status: attemptResult.ok ? "success" : "failed",
        attempts: attemptNumber,
        detail: attemptResult.ok
          ? { ok: true }
          : { error: attemptResult.error },
      }),
  });

  if (!result.ok) {
    logError("process_report.downstream_action_failed", {
      interactionId,
      kind,
      error: result.error,
    });
  }
}

/** Guild's configured mirror target, else the single-guild env fallback. */
function resolveMirrorTarget(guild: Guild | undefined): MirrorTarget | null {
  if (guild?.mirrorWebhookUrl && guild.mirrorType) {
    return {
      mirrorType: guild.mirrorType,
      mirrorWebhookUrl: guild.mirrorWebhookUrl,
    };
  }
  if (env.MIRROR_WEBHOOK_URL) {
    return {
      mirrorType: env.MIRROR_TYPE,
      mirrorWebhookUrl: env.MIRROR_WEBHOOK_URL,
    };
  }
  return null;
}

/**
 * Scheduled via `after()` from the interactions route once the deferred ack
 * (type 5) has been sent (build_plan.md Phase 3). Must never throw — the
 * HTTP response is already gone, and every downstream attempt is durably
 * recorded in `actions` regardless of outcome (code_standards.md §5).
 */
export async function processReportInBackground(
  input: ProcessReportInput,
): Promise<void> {
  try {
    const guild = await db.query.guilds.findFirst({
      where: eq(schema.guilds.id, input.guildId),
    });

    if (guild && guild.postChannelId) {
      const postChannelId = guild.postChannelId;
      await runDownstreamAction(input.interactionId, "discord_reply", () =>
        postToChannel(postChannelId, input.ackContent),
      );
    }

    if (input.rule.mirrorEnabled) {
      const target = resolveMirrorTarget(guild);
      if (target) {
        await runDownstreamAction(input.interactionId, "mirror", () =>
          sendMirrorNotification(target, input.ackContent),
        );
      }
    }

    const followUp = await editOriginalResponse(
      input.interactionToken,
      input.ackContent,
    );
    if (!followUp.ok) {
      logError("process_report.follow_up_failed", {
        interactionId: input.interactionId,
        error: followUp.error,
      });
    }
  } catch (error) {
    logError("process_report.unexpected_error", {
      interactionId: input.interactionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
