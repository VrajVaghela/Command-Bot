import "server-only";
import { verifyKey } from "discord-interactions";
import { env } from "@/lib/env";

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
  return verifyKey(rawBody, signature, timestamp, env.DISCORD_PUBLIC_KEY);
}
