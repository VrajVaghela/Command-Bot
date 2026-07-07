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
  reportModal,
} from "@/server/discord/respond";
import {
  REPORT_AGAIN_BUTTON_ID,
  REPORT_COMMAND,
  REPORT_MODAL_ID,
  REPORT_MODAL_MESSAGE_INPUT_ID,
  STATUS_COMMAND,
} from "@/server/discord/commands";
import {
  resolveCommandConfig,
  applyReportTemplate,
  type ResolvedCommandConfig,
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

/** One text-input value nested inside a MODAL_SUBMIT action row (library_docs.md §1). */
const modalComponentSchema = z.object({
  custom_id: z.string(),
  value: z.string().optional(),
});

const modalActionRowSchema = z.object({
  components: z.array(modalComponentSchema),
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
      name: z.string().optional(),
      options: z.array(interactionOptionSchema).optional(),
      // MESSAGE_COMPONENT (type 3) and MODAL_SUBMIT (type 5) dispatch key.
      custom_id: z.string().optional(),
      // MODAL_SUBMIT payload: array of action rows, each holding text inputs.
      components: z.array(modalActionRowSchema).optional(),
    })
    .optional(),
});

/** Pulls a named text-input's value out of a MODAL_SUBMIT's nested components. */
function extractModalValue(
  components: z.infer<typeof modalActionRowSchema>[] | undefined,
  customId: string,
): string | undefined {
  for (const row of components ?? []) {
    const match = row.components.find((c) => c.custom_id === customId);
    if (match?.value !== undefined) return match.value;
  }
  return undefined;
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

/** Best-effort log of the button click that opened the report modal — no downstream work to defer. */
async function recordModalOpened(
  interactionId: string,
  guildId: string | null,
  type: number,
): Promise<void> {
  try {
    await db
      .insert(schema.interactions)
      .values({
        id: interactionId,
        guildId,
        type,
        commandName: REPORT_COMMAND,
        status: "processed",
        responseSummary: "opened report modal",
      })
      .onConflictDoNothing({ target: schema.interactions.id });
  } catch (error) {
    logError("interactions.record_modal_opened_failed", {
      interactionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Shared by the `/report` slash command and the modal-submit follow-up
 * (build_plan.md Phase 6 "modal form") — both dedup, defer, and schedule the
 * exact same background pipeline (`process-report.ts`).
 */
async function handleReportSubmission(input: {
  interactionId: string;
  interactionToken: string;
  interactionType: number;
  guildId: string;
  user: { id: string; username: string } | undefined;
  config: ResolvedCommandConfig;
  message: string;
  payload: unknown;
}): Promise<NextResponse> {
  const ackContent = applyReportTemplate(input.config.rule, input.message);

  const inserted = await db
    .insert(schema.interactions)
    .values({
      id: input.interactionId,
      guildId: input.guildId,
      type: input.interactionType,
      commandName: REPORT_COMMAND,
      userId: input.user?.id ?? null,
      userName: input.user?.username ?? null,
      payload: input.payload,
      status: "processed",
      responseSummary: ackContent,
    })
    .onConflictDoNothing({ target: schema.interactions.id })
    .returning({ responseSummary: schema.interactions.responseSummary });

  if (!inserted[0]) {
    // Duplicate delivery: reply with the already-recorded result. Never
    // re-run the rule engine or schedule downstream work again.
    const recorded =
      (await fetchRecordedReply(input.interactionId)) ?? ackContent;
    return NextResponse.json(channelMessage(recorded));
  }

  // Defer: the channel post + mirror + AI triage + follow-up happen after
  // this HTTP response is sent (build_plan.md Phase 3 "immediate vs deferred").
  after(() =>
    processReportInBackground({
      interactionId: input.interactionId,
      interactionToken: input.interactionToken,
      guildId: input.guildId,
      reportMessage: input.message,
      ackContent,
      rule: input.config.rule,
    }),
  );
  return NextResponse.json(deferredChannelMessage());
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

  const isSupportedType =
    interaction.type === InteractionType.APPLICATION_COMMAND ||
    interaction.type === InteractionType.MESSAGE_COMPONENT ||
    interaction.type === InteractionType.MODAL_SUBMIT;

  if (!isSupportedType || !interaction.data) {
    return NextResponse.json(channelMessage("Unsupported interaction type."));
  }

  const commandName = interaction.data.name;
  const customId = interaction.data.custom_id;
  const user = interaction.member?.user ?? interaction.user;
  const guildId = interaction.guild_id ?? null;

  // Never throw across the Discord response path (code_standards.md §5) — any
  // unexpected failure still gets a valid, if generic, interaction response.
  try {
    // The "File another report" button — MESSAGE_COMPONENT (type 3) follow-up
    // (build_plan.md Phase 6 "interactive components").
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      if (customId === REPORT_AGAIN_BUTTON_ID) {
        const config = await resolveCommandConfig(guildId, REPORT_COMMAND);
        if (!config.enabled) {
          return NextResponse.json(
            channelMessage("The /report command is currently disabled."),
          );
        }
        await recordModalOpened(interaction.id, guildId, interaction.type);
        return NextResponse.json(reportModal());
      }
      return NextResponse.json(channelMessage("Unsupported action."));
    }

    // The report modal's submission — MODAL_SUBMIT (type 5) (build_plan.md
    // Phase 6 "modal form"). Reuses the exact `/report` pipeline.
    if (interaction.type === InteractionType.MODAL_SUBMIT) {
      if (customId === REPORT_MODAL_ID) {
        if (!guildId) {
          return NextResponse.json(
            channelMessage("/report can only be used inside a server."),
          );
        }
        const config = await resolveCommandConfig(guildId, REPORT_COMMAND);
        if (!config.enabled) {
          return NextResponse.json(
            channelMessage("The /report command is currently disabled."),
          );
        }
        const message = extractModalValue(
          interaction.data.components,
          REPORT_MODAL_MESSAGE_INPUT_ID,
        );
        return await handleReportSubmission({
          interactionId: interaction.id,
          interactionToken: interaction.token,
          interactionType: interaction.type,
          guildId,
          user,
          config,
          message: message ?? "(no message)",
          payload: interaction.data.components ?? null,
        });
      }
      return NextResponse.json(channelMessage("Unsupported action."));
    }

    // Command behavior is DB-driven, not hard-coded (agents.md §2/§3).
    const config = await resolveCommandConfig(guildId, commandName ?? "");
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
      return await handleReportSubmission({
        interactionId: interaction.id,
        interactionToken: interaction.token,
        interactionType: interaction.type,
        guildId,
        user,
        config,
        message: typeof message === "string" ? message : "(no message)",
        payload: interaction.data.options ?? null,
      });
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
