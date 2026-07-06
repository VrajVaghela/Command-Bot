import "server-only";
import { env } from "@/lib/env";
import { type Result, ok, err } from "@/lib/result";

/**
 * Posts a bot message into a channel (not an interaction reply) using the
 * bot token (library_docs.md §1). This is the `discord_reply` action kind —
 * the "/report posts to configured post_channel_id" requirement.
 */
export async function postToChannel(
  channelId: string,
  content: string,
): Promise<Result<void>> {
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      return err(`channel post failed: ${res.status}`);
    }
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error.message : "unknown error");
  }
}
