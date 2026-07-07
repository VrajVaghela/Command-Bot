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
import { reportAgainButtonRow } from "@/server/discord/respond";
import type { CommandRule } from "@/server/discord/rules";
import { triageReport } from "@/server/ai/gemini";

export type ProcessReportInput = {
  interactionId: string;
  interactionToken: string;
  guildId: string;
  /** The raw reported text, pre-template — what AI triage should read. */
  reportMessage: string;
  ackContent: string;
  rule: CommandRule;
};

/**
 * Runs one downstream action (`discord_reply`, `mirror`, or `ai`) through the
 * get-or-create + bounded-retry pipeline, recording every attempt. Never
 * throws — failures stay in the `actions` row for later inspection/retry
 * (`/api/mirror/retry`). Returns the `Result` so callers that need the
 * value (e.g. the AI summary) can use it; a skipped duplicate-delivery
 * returns a `success`-shaped placeholder since the row already recorded one.
 */
async function runDownstreamAction<T = void>(
  interactionId: string,
  kind: Action["kind"],
  send: () => Promise<Result<T>>,
  options: { maxRetries?: number } = {},
): Promise<Result<T | void>> {
  const action = await ensureAction(interactionId, kind);
  if (action.status === "success") return { ok: true, value: undefined };

  const result = await withRetry(send, {
    maxRetries: options.maxRetries,
    onAttempt: (attemptNumber, attemptResult) =>
      recordActionAttempt(action.id, {
        status: attemptResult.ok ? "success" : "failed",
        attempts: attemptNumber,
        detail: attemptResult.ok
          ? { ok: true, value: attemptResult.value }
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
  return result;
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

    let followUpContent = input.ackContent;
    if (input.rule.aiEnabled && env.AI_ENABLED) {
      // Single attempt — a free-tier LLM call isn't worth 3x retrying inside
      // the 20s background-work budget (library_docs.md §5 "resilient").
      const triage = await runDownstreamAction(
        input.interactionId,
        "ai",
        () => triageReport(input.reportMessage),
        { maxRetries: 1 },
      );
      if (triage.ok && triage.value) {
        followUpContent = `${input.ackContent}\n\n🤖 ${triage.value.summary}`;
      }
    }

    const followUp = await editOriginalResponse(
      input.interactionToken,
      followUpContent,
      { components: [reportAgainButtonRow()] },
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
