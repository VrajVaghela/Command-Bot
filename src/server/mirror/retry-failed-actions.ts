import "server-only";
import { and, eq, lt } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Guild } from "@/server/db/schema";
import { recordActionAttempt } from "@/server/db/actions";
import { withRetry, MAX_RETRIES } from "@/server/lib/retry";
import { postToChannel } from "@/server/discord/channel-post";
import {
  sendMirrorNotification,
  type MirrorTarget,
} from "@/server/mirror/send-mirror";
import { env } from "@/lib/env";
import { err, type Result } from "@/lib/result";

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

export type RetryResult = {
  id: string;
  retried: boolean;
  ok?: boolean;
  reason?: string;
};

/**
 * Recovery worker for `actions` rows that exhausted their inline retries
 * inside `after()` (build_plan.md Phase 5 "downstream-down → recorded
 * failure + retry, no data loss"). Extracted so both the auth-gated
 * `/api/mirror/retry` route and the dashboard's "Retry failed actions"
 * Server Action (`server/actions/mirror.ts`) share one implementation.
 */
export async function retryFailedActions(): Promise<RetryResult[]> {
  const failed = await db
    .select({
      id: schema.actions.id,
      kind: schema.actions.kind,
      attempts: schema.actions.attempts,
      responseSummary: schema.interactions.responseSummary,
      guildId: schema.interactions.guildId,
    })
    .from(schema.actions)
    .innerJoin(
      schema.interactions,
      eq(schema.actions.interactionId, schema.interactions.id),
    )
    .where(
      and(
        eq(schema.actions.status, "failed"),
        lt(schema.actions.attempts, MAX_RETRIES),
      ),
    );

  const results: RetryResult[] = [];

  for (const action of failed) {
    if (!action.responseSummary) {
      results.push({
        id: action.id,
        retried: false,
        reason: "no recorded content",
      });
      continue;
    }
    const content = action.responseSummary;

    const guild = action.guildId
      ? await db.query.guilds.findFirst({
          where: eq(schema.guilds.id, action.guildId),
        })
      : undefined;

    const send = async (): Promise<Result<void>> => {
      if (action.kind === "mirror") {
        const target = resolveMirrorTarget(guild);
        if (!target) return err("no mirror target configured");
        return sendMirrorNotification(target, content);
      }
      if (!guild?.postChannelId) return err("no post channel configured");
      return postToChannel(guild.postChannelId, content);
    };

    const result = await withRetry(send, {
      maxRetries: Math.max(1, MAX_RETRIES - action.attempts),
      onAttempt: (attemptNumber, attemptResult) =>
        recordActionAttempt(action.id, {
          status: attemptResult.ok ? "success" : "failed",
          attempts: action.attempts + attemptNumber,
          detail: attemptResult.ok
            ? { ok: true }
            : { error: attemptResult.error },
        }),
    });

    results.push({ id: action.id, retried: true, ok: result.ok });
  }

  return results;
}
