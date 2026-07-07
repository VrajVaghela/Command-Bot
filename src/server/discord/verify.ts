import "server-only";
import { verifyKey } from "discord-interactions";
import { env } from "@/lib/env";

/**
 * `verifyKey` only proves the signature covers this exact timestamp+body — it
 * never rejects an old-but-validly-signed request. Without a freshness check,
 * a captured request could be replayed indefinitely (build_plan.md Phase 5
 * "bad timestamp, replayed body → 401", distinct from interaction-id dedup,
 * which handles a *fresh* duplicate delivery, not a stale replay).
 */
export const MAX_TIMESTAMP_SKEW_SECONDS = 300;

/**
 * Ed25519 verification for incoming Discord interaction requests. Must run
 * against the raw, unparsed request body (architecture.md §5) — callers
 * should read the body with `req.text()` before this and only `JSON.parse`
 * after it returns `true`.
 */
export async function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): Promise<boolean> {
  if (!signature || !timestamp) return false;

  const cryptoValid = await verifyKey(
    rawBody,
    signature,
    timestamp,
    env.DISCORD_PUBLIC_KEY,
  );
  if (!cryptoValid) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  return ageSeconds <= MAX_TIMESTAMP_SKEW_SECONDS;
}
