import "server-only";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import { db, schema } from "@/server/db";

/**
 * Command rule engine (architecture.md §5, build_plan.md Phase 3). Command
 * behavior is read from `command_configs.rule` (jsonb), never hard-coded
 * (agents.md §2 "Config over code"). Shape matches what Phase 4's dashboard
 * UI will read/write, even though `keywordTags`/`aiEnabled` go unused until
 * later phases.
 */
export const ruleSchema = z.object({
  responseTemplate: z.string().min(1).optional(),
  mirrorEnabled: z.boolean().default(true),
  aiEnabled: z.boolean().default(false),
  keywordTags: z.array(z.string()).default([]),
});
export type CommandRule = z.infer<typeof ruleSchema>;

export const defaultRule: CommandRule = ruleSchema.parse({});

export type ResolvedCommandConfig = {
  enabled: boolean;
  rule: CommandRule;
};

const defaultConfig: ResolvedCommandConfig = {
  enabled: true,
  rule: defaultRule,
};

/**
 * Loads `command_configs` for a guild+command. Missing row (no admin has
 * configured this guild yet, e.g. before Phase 4 ships) or malformed jsonb
 * both fall back to sane defaults rather than failing the interaction.
 */
export async function resolveCommandConfig(
  guildId: string | null,
  commandName: string,
): Promise<ResolvedCommandConfig> {
  if (!guildId) return defaultConfig;

  const row = await db.query.commandConfigs.findFirst({
    where: and(
      eq(schema.commandConfigs.guildId, guildId),
      eq(schema.commandConfigs.commandName, commandName),
    ),
  });
  if (!row) return defaultConfig;

  const parsed = ruleSchema.safeParse(row.rule);
  return {
    enabled: row.enabled,
    rule: parsed.success ? parsed.data : defaultRule,
  };
}

/** Applies a `{message}`-placeholder template; falls back to a fixed default. */
export function applyReportTemplate(
  rule: CommandRule,
  message: string,
): string {
  const template = rule.responseTemplate ?? "📩 Report received: {message}";
  return template.replaceAll("{message}", message);
}
