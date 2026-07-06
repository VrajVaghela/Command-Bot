"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ruleSchema } from "@/server/discord/rules";

const patchSchema = z.object({
  guildId: z.string().min(1),
  commandName: z.string().min(1),
  enabled: z.boolean(),
  responseTemplate: z.string().optional(),
  mirrorEnabled: z.boolean(),
  aiEnabled: z.boolean(),
});

/**
 * Command config UI submit (build_plan.md Phase 4) — writes exactly the
 * `ruleSchema` shape `src/server/discord/rules.ts` reads at interaction time,
 * so there's no drift between the editor and the rule engine.
 */
export async function updateCommandConfig(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const parsed = patchSchema.safeParse({
    guildId: formData.get("guildId"),
    commandName: formData.get("commandName"),
    enabled: formData.get("enabled") === "on",
    responseTemplate: formData.get("responseTemplate") || undefined,
    mirrorEnabled: formData.get("mirrorEnabled") === "on",
    aiEnabled: formData.get("aiEnabled") === "on",
  });
  if (!parsed.success) {
    throw new Error("Invalid command config submission.");
  }

  const rule = ruleSchema.parse({
    responseTemplate: parsed.data.responseTemplate,
    mirrorEnabled: parsed.data.mirrorEnabled,
    aiEnabled: parsed.data.aiEnabled,
    keywordTags: [],
  });

  await db
    .insert(schema.commandConfigs)
    .values({
      guildId: parsed.data.guildId,
      commandName: parsed.data.commandName,
      enabled: parsed.data.enabled,
      rule,
    })
    .onConflictDoUpdate({
      target: [
        schema.commandConfigs.guildId,
        schema.commandConfigs.commandName,
      ],
      set: { enabled: parsed.data.enabled, rule, updatedAt: new Date() },
    });

  revalidatePath("/commands");
}
