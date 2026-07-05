import { z } from "zod";

/**
 * Fail-fast, Zod-validated environment access. This is the ONLY place feature code
 * reads configuration from — never touch `process.env` directly (architecture.md §7).
 *
 * Split into a server schema (secrets) and a client schema (`NEXT_PUBLIC_*` only).
 * The server half is validated once at module load, but ONLY on the server; on the
 * client, `env` is a Proxy that throws on access so secrets can never be read from
 * (or bundled into) the browser.
 */

/** Treat empty-string env vars as "unset" so `.optional()` behaves intuitively. */
const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal("").transform(() => undefined));

const serverSchema = z.object({
  // Required from Phase 1 onward — the app cannot boot without a database.
  DATABASE_URL: z.string().url(),

  // Phase 2+ (Discord interactions endpoint). Optional now so the skeleton boots
  // before the Discord application exists; tighten to required in Phase 2.
  DISCORD_APP_ID: optionalString,
  DISCORD_PUBLIC_KEY: optionalString,
  DISCORD_BOT_TOKEN: optionalString,

  // Phase 4+ (Auth.js session signing). Required once auth lands.
  AUTH_SECRET: optionalString,

  // Phase 3+ single-guild mirror fallback (per-guild URLs live in the DB).
  MIRROR_WEBHOOK_URL: optionalUrl,

  // Phase 6 stretch (AI triage). Off by default; requires a free Gemini key.
  GEMINI_API_KEY: optionalString,
  AI_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const clientSchema = z.object({
  // Client-safe, non-secret. Public base URL of the deployed app.
  NEXT_PUBLIC_APP_URL: optionalUrl,
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

function parseServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast and loud, but never echo the offending values (secrets).
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error)}`,
    );
  }
  return parsed.data;
}

function parseClientEnv(): ClientEnv {
  // NEXT_PUBLIC_* vars are statically inlined by Next, so reference them explicitly.
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid client environment variables:\n${formatIssues(parsed.error)}`,
    );
  }
  return parsed.data;
}

const serverEnvGuard = new Proxy({} as ServerEnv, {
  get() {
    throw new Error(
      "Server env was accessed on the client. Read `env` only from server code " +
        "(`src/server/**`, Server Components/Actions); use `clientEnv` in the browser.",
    );
  },
});

/** Validated server env. Import only from server code. Throws if read on the client. */
export const env: ServerEnv =
  typeof window === "undefined" ? parseServerEnv() : serverEnvGuard;

/** Validated client-safe env. Safe to import anywhere. */
export const clientEnv: ClientEnv = parseClientEnv();
