import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";
import * as schema from "@/server/db/schema";
import { REPORT_COMMAND, STATUS_COMMAND } from "@/server/discord/commands";

/**
 * Dev-only convenience for Phase 3 testing: upserts a `guilds` row (+ default
 * `command_configs` rows for report/status) so `/report` has a channel to
 * post to and a mirror target, before Phase 4's connect-server UI exists.
 * Writes exactly the schema Phase 4 will read/write — nothing here needs to
 * be redone later.
 *
 * Run via:
 *   npm run db:seed-guild -- --post-channel <channelId> [--name "..."] [--mirror-url <url>] [--mirror-type slack|discord]
 *
 * Requires DISCORD_DEV_GUILD_ID in .env.local (the same test-server id used
 * by `npm run discord:register`). Mirror target defaults to the env
 * MIRROR_WEBHOOK_URL/MIRROR_TYPE fallback when --mirror-url isn't passed.
 *
 * Builds its own Drizzle client instead of importing `@/server/db`: that
 * module is `import "server-only"`-guarded, which only no-ops under Next's
 * `react-server` bundler condition — running it directly via `tsx` (as this
 * script does) would throw.
 */
const db = drizzle(neon(env.DATABASE_URL), { schema });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function seedGuild() {
  const guildId = env.DISCORD_DEV_GUILD_ID;
  if (!guildId) {
    throw new Error(
      "DISCORD_DEV_GUILD_ID must be set in .env.local (the test server to seed).",
    );
  }

  const postChannelId = arg("post-channel");
  if (!postChannelId) {
    throw new Error("Pass --post-channel <channelId> (where /report posts).");
  }

  const name = arg("name") ?? "Dev/Test Guild";
  const mirrorWebhookUrl = arg("mirror-url") ?? env.MIRROR_WEBHOOK_URL ?? null;
  const mirrorType = mirrorWebhookUrl
    ? ((arg("mirror-type") ?? env.MIRROR_TYPE) as "slack" | "discord")
    : null;

  await db
    .insert(schema.guilds)
    .values({ id: guildId, name, postChannelId, mirrorType, mirrorWebhookUrl })
    .onConflictDoUpdate({
      target: schema.guilds.id,
      set: { name, postChannelId, mirrorType, mirrorWebhookUrl },
    });

  for (const commandName of [REPORT_COMMAND, STATUS_COMMAND]) {
    await db
      .insert(schema.commandConfigs)
      .values({ guildId, commandName, enabled: true, rule: {} })
      .onConflictDoNothing({
        target: [
          schema.commandConfigs.guildId,
          schema.commandConfigs.commandName,
        ],
      });
  }

  console.log(
    `Seeded guild ${guildId} — post channel ${postChannelId}` +
      (mirrorWebhookUrl
        ? `, mirror (${mirrorType}) configured.`
        : ", no mirror configured."),
  );
}

seedGuild().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
