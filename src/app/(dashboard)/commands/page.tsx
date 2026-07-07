import Link from "next/link";
import { eq } from "drizzle-orm";

import { CommandConfigForm } from "@/components/command-config-form";
import { GuildSwitcher } from "@/components/guild-switcher";
import { db, schema } from "@/server/db";
import { listConnectedGuilds } from "@/server/db/guilds";
import { commandDefinitions } from "@/server/discord/commands";
import type { CommandConfig } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function CommandsPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const [guilds, { guild: requestedGuildId }] = await Promise.all([
    listConnectedGuilds(),
    searchParams,
  ]);

  const guild =
    guilds.find((g) => g.id === requestedGuildId) ?? guilds[0] ?? null;

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Command configuration</h2>
        <GuildSwitcher guilds={guilds} selectedGuildId={guild.id} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {configs.map((config) => (
          <CommandConfigForm key={config.commandName} config={config} />
        ))}
      </div>
    </div>
  );
}
