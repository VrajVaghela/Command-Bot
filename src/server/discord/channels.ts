import "server-only";
import { z } from "zod";

import { env } from "@/lib/env";
import { type Result, ok, err } from "@/lib/result";

/** Discord channel types that accept a bot-posted message (text + announcement). */
const POSTABLE_CHANNEL_TYPES = new Set([0, 5]);

const channelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
});

export type GuildChannel = { id: string; name: string };

/**
 * Lists the text channels a connected guild has, via the bot token
 * (library_docs.md §1 — `Authorization: Bot <token>`, server-only). Used by
 * the connect-server flow's channel picker. Result-wrapped like
 * `send-mirror.ts` — a Discord API hiccup here must not crash the page.
 */
export async function listGuildChannels(
  guildId: string,
): Promise<Result<GuildChannel[]>> {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } },
    );
    if (!res.ok) {
      return err(`Discord API returned ${res.status}`);
    }

    const body = z.array(channelSchema).safeParse(await res.json());
    if (!body.success) {
      return err("Unexpected response shape from Discord.");
    }

    return ok(
      body.data
        .filter((c) => POSTABLE_CHANNEL_TYPES.has(c.type))
        .map((c) => ({ id: c.id, name: c.name })),
    );
  } catch (error) {
    return err(error instanceof Error ? error.message : "unknown error");
  }
}
