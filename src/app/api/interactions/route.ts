import { NextRequest, NextResponse } from "next/server";
import { InteractionType } from "discord-interactions";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/server/db";
import { verifyDiscordRequest } from "@/server/discord/verify";
import { channelMessage, pong } from "@/server/discord/respond";
import { REPORT_COMMAND, STATUS_COMMAND } from "@/server/discord/commands";

/**
 * Discord's HTTP Interactions endpoint (architecture.md §2, §4). Must, in
 * order: verify signature -> handle PING -> dedup -> record -> respond. Runs
 * on the Node runtime because Ed25519 verification needs the raw body.
 */
export const runtime = "nodejs";

const interactionUserSchema = z.object({
  id: z.string(),
  username: z.string(),
});

const interactionOptionSchema = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const interactionSchema = z.object({
  id: z.string(),
  type: z.number(),
  guild_id: z.string().optional(),
  member: z.object({ user: interactionUserSchema }).optional(),
  user: interactionUserSchema.optional(),
  data: z
    .object({
      name: z.string(),
      options: z.array(interactionOptionSchema).optional(),
    })
    .optional(),
});

function buildReplyContent(
  commandName: string,
  options:
    Array<{ name: string; value?: string | number | boolean }> | undefined,
): string {
  switch (commandName) {
    case STATUS_COMMAND:
      return "✅ Abstrait is online and receiving commands.";
    case REPORT_COMMAND: {
      const message = options?.find((o) => o.name === "message")?.value;
      return `📩 Report received: ${typeof message === "string" ? message : "(no message)"}`;
    }
    default:
      return "Unrecognized command.";
  }
}

/** Reprocessing a delivered interaction is a no-op returning the recorded result (architecture.md §4.6). */
async function fetchRecordedReply(
  interactionId: string,
): Promise<string | null> {
  const row = await db.query.interactions.findFirst({
    where: eq(schema.interactions.id, interactionId),
    columns: { responseSummary: true },
  });
  return row?.responseSummary ?? null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");

  const verified = await verifyDiscordRequest(rawBody, signature, timestamp);
  if (!verified) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  const parsed = interactionSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return new NextResponse("invalid interaction payload", { status: 400 });
  }
  const interaction = parsed.data;

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json(pong());
  }

  if (
    interaction.type !== InteractionType.APPLICATION_COMMAND ||
    !interaction.data
  ) {
    return NextResponse.json(channelMessage("Unsupported interaction type."));
  }

  // Never throw across the Discord response path (code_standards.md §5) — any
  // unexpected failure still gets a valid, if generic, interaction response.
  try {
    const commandName = interaction.data.name;
    const user = interaction.member?.user ?? interaction.user;
    const content = buildReplyContent(commandName, interaction.data.options);

    const inserted = await db
      .insert(schema.interactions)
      .values({
        id: interaction.id,
        guildId: interaction.guild_id ?? null,
        type: interaction.type,
        commandName,
        userId: user?.id ?? null,
        userName: user?.username ?? null,
        payload: interaction.data.options ?? null,
        status: "processed",
        responseSummary: content,
      })
      .onConflictDoNothing({ target: schema.interactions.id })
      .returning({ responseSummary: schema.interactions.responseSummary });

    const replyContent =
      inserted[0]?.responseSummary ??
      (await fetchRecordedReply(interaction.id)) ??
      content;

    return NextResponse.json(channelMessage(replyContent));
  } catch (error) {
    console.error("interactions route: failed to handle command", error);
    return NextResponse.json(
      channelMessage("Something went wrong handling that command."),
    );
  }
}
