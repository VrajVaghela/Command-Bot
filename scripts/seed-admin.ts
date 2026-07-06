import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";

import { env } from "@/lib/env";
import * as schema from "@/server/db/schema";

/**
 * Seeds (or resets the password of) one admin login for the dashboard
 * (project_overview.md §6 — single admin credential for MVP). Builds its own
 * Drizzle client instead of importing `@/server/db`, same reason
 * `seed-guild.ts` does: that module is `import "server-only"`-guarded, which
 * only no-ops under Next's `react-server` bundler condition and would throw
 * running directly via `tsx`.
 *
 * Run via:
 *   npm run db:seed-admin -- --email admin@example.com --password "..."
 */
const db = drizzle(neon(env.DATABASE_URL), { schema });

const SALT_ROUNDS = 12;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function seedAdmin() {
  const email = arg("email");
  const password = arg("password");
  if (!email || !password) {
    throw new Error(
      "Pass --email <email> --password <password> (throwaway admin login).",
    );
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await db
    .insert(schema.adminUsers)
    .values({ email, passwordHash })
    .onConflictDoUpdate({
      target: schema.adminUsers.email,
      set: { passwordHash },
    });

  console.log(`Seeded admin login for ${email}.`);
}

seedAdmin().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
