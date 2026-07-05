import { env } from "@/lib/env";
import { commandDefinitions } from "@/server/discord/commands";

/**
 * One-off registration of the slash commands (library_docs.md §1). Guild-scoped
 * (via DISCORD_DEV_GUILD_ID) registers instantly for fast dev iteration; without
 * it, registers globally (propagation can take up to ~1 hour).
 *
 * Run via `npm run discord:register`, which loads `.env.local` with Node's
 * `--env-file` flag *before* this module (and its `@/lib/env` import) evaluates
 * — ESM import hoisting means a `dotenv.config()` call here would run too late.
 */
async function registerCommands() {
  const url = env.DISCORD_DEV_GUILD_ID
    ? `https://discord.com/api/v10/applications/${env.DISCORD_APP_ID}/guilds/${env.DISCORD_DEV_GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${env.DISCORD_APP_ID}/commands`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commandDefinitions),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Discord command registration failed (${res.status}): ${body}`,
    );
  }

  const registered = (await res.json()) as Array<{ name: string }>;
  console.log(
    `Registered ${registered.length} command(s): ${registered.map((c) => c.name).join(", ")}`,
    env.DISCORD_DEV_GUILD_ID
      ? `(guild ${env.DISCORD_DEV_GUILD_ID})`
      : "(global — may take up to ~1 hour to propagate)",
  );
}

registerCommands().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
