import { ConnectServerPanel } from "@/components/connect-server-panel";
import { GuildSwitcher } from "@/components/guild-switcher";
import { env } from "@/lib/env";
import { listConnectedGuilds } from "@/server/db/guilds";

export const dynamic = "force-dynamic";

// Minimal bot permissions: View Channel (1024) + Send Messages (2048).
const BOT_PERMISSIONS = 3072;

export default async function ConnectedServerPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const [guilds, { guild: requestedGuildId }] = await Promise.all([
    listConnectedGuilds(),
    searchParams,
  ]);
  const selectedGuild =
    guilds.find((g) => g.id === requestedGuildId) ?? guilds[0];
  const inviteUrl =
    `https://discord.com/api/oauth2/authorize` +
    `?client_id=${env.DISCORD_APP_ID}&permissions=${BOT_PERMISSIONS}&scope=bot%20applications.commands`;

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Connected Server</h2>
        {selectedGuild && (
          <GuildSwitcher guilds={guilds} selectedGuildId={selectedGuild.id} />
        )}
      </div>
      <p className="text-muted-foreground mb-4 text-sm">
        {guilds.length > 0
          ? "Edit the selected server below, or connect another by entering a new Guild ID."
          : "Invite the bot, then connect your first server below."}
      </p>
      <ConnectServerPanel existingGuild={selectedGuild} inviteUrl={inviteUrl} />
    </div>
  );
}
