import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client over Neon's HTTP driver (serverless-friendly). SQL/Drizzle access
 * happens ONLY in `src/server/**` (architecture.md §4.3). `server-only` makes any
 * accidental import from a Client Component a build error.
 *
 * Constructed lazily on first use: `neon()` throws if `DATABASE_URL` is absent,
 * and `next build` imports this module (via every route/page) while collecting
 * page data — before any query runs. Deferring construction lets the build
 * complete without the runtime secret, while the first real query still fails
 * fast if it's genuinely missing.
 */
type Database = NeonHttpDatabase<typeof schema>;

let cachedDb: Database | undefined;
function getDb(): Database {
  return (cachedDb ??= drizzle(neon(env.DATABASE_URL), { schema }));
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    // Bind methods so Drizzle's internals see the real client as `this`,
    // not the Proxy (which would break query building).
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});

export { schema };
