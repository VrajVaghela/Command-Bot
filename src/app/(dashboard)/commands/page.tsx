import Link from "next/link";
import { eq } from "drizzle-orm";

import { CommandConfigForm } from "@/components/command-config-form";
import { db, schema } from "@/server/db";
import { commandDefinitions } from "@/server/discord/commands";
import type { CommandConfig } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function CommandsPage() {
  const guild = await db.query.guilds.findFirst();

  if (!guild) {
    return (
      <div className="text-muted-foreground text-sm">
        No server connected yet.{" "}
        <Link href="/server" className="text-primary underline">
          Connect one first
        </Link>
        .
      </div>
    );
  }

  const rows = await db.query.commandConfigs.findMany({
    where: eq(schema.commandConfigs.guildId, guild.id),
  });
  const byName = new Map(rows.map((r) => [r.commandName, r]));

  const configs: CommandConfig[] = commandDefinitions.map((def) => {
    const existing = byName.get(def.name);
    if (existing) return existing;
    // No row yet for this command — render sane defaults (rules.ts's own fallback).
    return {
      id: "",
      guildId: guild.id,
      commandName: def.name,
      enabled: true,
      rule: {},
      updatedAt: new Date(),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Command configuration</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {configs.map((config) => (
          <CommandConfigForm key={config.commandName} config={config} />
        ))}
      </div>
    </div>
  );
}
