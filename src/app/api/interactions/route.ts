import { NextRequest, NextResponse, after } from "next/server";
import { InteractionType } from "discord-interactions";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/server/db";
import { verifyDiscordRequest } from "@/server/discord/verify";
import {
  channelMessage,
  deferredChannelMessage,
  pong,
} from "@/server/discord/respond";
import { REPORT_COMMAND, STATUS_COMMAND } from "@/server/discord/commands";
import {
  resolveCommandConfig,
  applyReportTemplate,
} from "@/server/discord/rules";
import { processReportInBackground } from "@/server/discord/process-report";
import { checkRateLimit } from "@/server/lib/rate-limit";
import { logError, logWarn } from "@/server/lib/logger";

/** Basic abuse guard (build_plan.md Phase 5) — see rate-limit.ts for the trade-off. */
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 10_000;

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Discord's HTTP Interactions endpoint (architecture.md §2, §4). Must, in
 * order: verify signature -> handle PING -> dedup -> record -> respond. Runs
 * on the Node runtime because Ed25519 verification needs the raw body.
 * `maxDuration` covers the `after()` background work scheduled for /report
 * (channel post + mirror + follow-up) — it runs after the HTTP response is
 * already sent, so it isn't bound by Discord's ~3s ack window.
 */
export const runtime = "nodejs";
export const maxDuration = 20;

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
  token: z.string(),
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

/** Best-effort — the caller's own catch already covers the user-facing reply. */
async function recordInteractionFailure(
  interactionId: string,
  type: number,
  guildId: string | null,
): Promise<void> {
  try {
    await db
      .insert(schema.interactions)
      .values({ id: interactionId, guildId, type, status: "failed" })
      .onConflictDoNothing({ target: schema.interactions.id });
  } catch (error) {
    logError("interactions.record_failure_failed", {
      interactionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function POST(req: NextRequest) {
  // Cheapest possible rejection first — doesn't skip verification for
  // anything under the limit, just blunts a flood before it reaches the DB
  // (build_plan.md Phase 5 "basic rate-limit / abuse guard").
  const ip = clientIp(req);
  if (!checkRateLimit(ip, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
    logWarn("interactions.rate_limited", { ip });
    return new NextResponse("too many requests", { status: 429 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");

  const verified = await verifyDiscordRequest(rawBody, signature, timestamp);
  if (!verified) {
    logWarn("interactions.signature_rejected", { ip });
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

  const commandName = interaction.data.name;
  const user = interaction.member?.user ?? interaction.user;
  const guildId = interaction.guild_id ?? null;

  // Never throw across the Discord response path (code_standards.md §5) — any
  // unexpected failure still gets a valid, if generic, interaction response.
  try {
    // Command behavior is DB-driven, not hard-coded (agents.md §2/§3).
    const config = await resolveCommandConfig(guildId, commandName);
    if (!config.enabled) {
      return NextResponse.json(
        channelMessage(`The /${commandName} command is currently disabled.`),
      );
    }

    if (commandName === REPORT_COMMAND) {
      if (!guildId) {
        return NextResponse.json(
          channelMessage("/report can only be used inside a server."),
        );
      }

      const message = interaction.data.options?.find(
        (o) => o.name === "message",
      )?.value;
      const ackContent = applyReportTemplate(
        config.rule,
        typeof message === "string" ? message : "(no message)",
      );

      const inserted = await db
        .insert(schema.interactions)
        .values({
          id: interaction.id,
          guildId,
          type: interaction.type,
          commandName,
          userId: user?.id ?? null,
          userName: user?.username ?? null,
          payload: interaction.data.options ?? null,
          status: "processed",
          responseSummary: ackContent,
        })
        .onConflictDoNothing({ target: schema.interactions.id })
        .returning({ responseSummary: schema.interactions.responseSummary });

      if (!inserted[0]) {
        // Duplicate delivery: reply with the already-recorded result. Never
        // re-run the rule engine or schedule downstream work again.
        const recorded =
          (await fetchRecordedReply(interaction.id)) ?? ackContent;
        return NextResponse.json(channelMessage(recorded));
      }

      // Defer: the channel post + mirror + follow-up happen after this HTTP
      // response is sent (build_plan.md Phase 3 "immediate vs deferred").
      after(() =>
        processReportInBackground({
          interactionId: interaction.id,
          interactionToken: interaction.token,
          guildId,
          ackContent,
          rule: config.rule,
        }),
      );
      return NextResponse.json(deferredChannelMessage());
    }

    // /status (and any other simple command): immediate reply, no downstream actions.
    const content =
      commandName === STATUS_COMMAND
        ? "✅ Abstrait is online and receiving commands."
        : "Unrecognized command.";

    const inserted = await db
      .insert(schema.interactions)
      .values({
        id: interaction.id,
        guildId,
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
    logError("interactions.command_failed", {
      interactionId: interaction.id,
      commandName,
      guildId,
      error: error instanceof Error ? error.message : String(error),
    });
    await recordInteractionFailure(interaction.id, interaction.type, guildId);
    return NextResponse.json(
      channelMessage("Something went wrong handling that command."),
    );
  }
}
