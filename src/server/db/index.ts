import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client over Neon's HTTP driver (serverless-friendly). SQL/Drizzle access
 * happens ONLY in `src/server/**` (architecture.md §4.3). `server-only` makes any
 * accidental import from a Client Component a build error.
 */
export const db = drizzle(neon(env.DATABASE_URL), { schema });

export { schema };
