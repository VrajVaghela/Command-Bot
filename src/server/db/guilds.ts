import "server-only";
import { asc } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Guild } from "@/server/db/schema";

/** All connected guilds, oldest first (build_plan.md Phase 6 "multi-server"). */
export async function listConnectedGuilds(): Promise<Guild[]> {
  return db.query.guilds.findMany({ orderBy: asc(schema.guilds.createdAt) });
}
