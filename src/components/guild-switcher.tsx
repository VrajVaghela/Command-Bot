"use client";

import { useRouter, usePathname } from "next/navigation";

import { Select } from "@/components/ui/Select";
import type { Guild } from "@/server/db/schema";

/** Switches which connected guild the dashboard pages scope their data to (ui_registry.md). */
export function GuildSwitcher({
  guilds,
  selectedGuildId,
}: {
  guilds: Guild[];
  selectedGuildId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (guilds.length <= 1) return null;

  return (
    <div className="w-64">
      <Select
        aria-label="Connected server"
        options={guilds.map((g) => ({ value: g.id, label: g.name }))}
        value={selectedGuildId}
        onChange={(e) => {
          const params = new URLSearchParams({ guild: e.target.value });
          router.push(`${pathname}?${params.toString()}`);
        }}
      />
    </div>
  );
}
