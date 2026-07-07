"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { type Result, err } from "@/lib/result";
import { auth } from "@/server/auth";
import { db, schema } from "@/server/db";
import { REPORT_COMMAND, STATUS_COMMAND } from "@/server/discord/commands";
import {
  listGuildChannels,
  type GuildChannel,
} from "@/server/discord/channels";

/** Fetches the connected guild's text channels for the picker (build_plan.md Phase 4). */
export async function fetchChannelsAction(
  guildId: string,
): Promise<Result<GuildChannel[]>> {
  const session = await auth();
  if (!session?.user) return err("Unauthorized");

  const trimmed = guildId.trim();
  if (!trimmed) return err("Enter a Guild ID first.");

  return listGuildChannels(trimmed);
}

const connectSchema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1),
  postChannelId: z.string().min(1),
  mirrorType: z.enum(["slack", "discord"]),
  mirrorWebhookUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/**
 * Persists the connect-server flow (guild id, post channel, mirror target).
 * Seeds default `command_configs` rows for `/report` and `/status`, same as
 * `scripts/seed-guild.ts` did for dev — this is that flow's UI equivalent.
 * A blank mirror webhook field keeps the existing (never re-sent-to-client)
 * secret rather than clobbering it (SecretInput's contract).
 */
export async function saveGuildConnection(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const parsed = connectSchema.safeParse({
    guildId: formData.get("guildId"),
    name: formData.get("name"),
    postChannelId: formData.get("postChannelId"),
    mirrorType: formData.get("mirrorType"),
    mirrorWebhookUrl: formData.get("mirrorWebhookUrl"),
  });
  if (!parsed.success) {
    throw new Error("Invalid connect-server submission.");
  }

  const existing = await db.query.guilds.findFirst({
    where: eq(schema.guilds.id, parsed.data.guildId),
  });
  const mirrorWebhookUrl =
    parsed.data.mirrorWebhookUrl ?? existing?.mirrorWebhookUrl ?? null;

  await db
    .insert(schema.guilds)
    .values({
      id: parsed.data.guildId,
      name: parsed.data.name,
      postChannelId: parsed.data.postChannelId,
      mirrorType: parsed.data.mirrorType,
      mirrorWebhookUrl,
      connectedBy: session.user.id ?? null,
    })
    .onConflictDoUpdate({
      target: schema.guilds.id,
      set: {
        name: parsed.data.name,
        postChannelId: parsed.data.postChannelId,
        mirrorType: parsed.data.mirrorType,
        mirrorWebhookUrl,
        connectedBy: session.user.id ?? existing?.connectedBy ?? null,
      },
    });

  for (const commandName of [REPORT_COMMAND, STATUS_COMMAND]) {
    await db
      .insert(schema.commandConfigs)
      .values({
        guildId: parsed.data.guildId,
        commandName,
        enabled: true,
        rule: {},
      })
      .onConflictDoNothing({
        target: [
          schema.commandConfigs.guildId,
          schema.commandConfigs.commandName,
        ],
      });
  }

  revalidatePath("/server");
  revalidatePath("/commands");
  revalidatePath("/dashboard");
  // Select the just-saved guild so multi-server admins land on what they edited
  // (build_plan.md Phase 6 "multi-server") — redirect() throws, so this must
  // be the last statement.
  redirect(`/server?guild=${parsed.data.guildId}`);
}
