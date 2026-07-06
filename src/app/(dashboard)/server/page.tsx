import { ConnectServerPanel } from "@/components/connect-server-panel";
import { env } from "@/lib/env";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// Minimal bot permissions: View Channel (1024) + Send Messages (2048).
const BOT_PERMISSIONS = 3072;

export default async function ConnectedServerPage() {
  const guild = await db.query.guilds.findFirst();
  const inviteUrl =
    `https://discord.com/api/oauth2/authorize` +
    `?client_id=${env.DISCORD_APP_ID}&permissions=${BOT_PERMISSIONS}&scope=bot%20applications.commands`;

  return (
    <div className="max-w-xl">
      <h2 className="mb-4 text-lg font-semibold">Connected Server</h2>
      <ConnectServerPanel existingGuild={guild} inviteUrl={inviteUrl} />
    </div>
  );
}
