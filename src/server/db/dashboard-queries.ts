import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Action, Interaction } from "@/server/db/schema";

export type FailedAction = Pick<
  Action,
  "id" | "kind" | "status" | "attempts" | "detail" | "updatedAt"
> & {
  commandName: string | null;
  guildId: string | null;
};

export type InteractionWithActions = Interaction & { actions: Action[] };

/**
 * Recent interactions + their actions for the live log (build_plan.md Phase
 * 4). Two flat queries + an in-memory join rather than a Drizzle relational
 * query, since `schema.ts` doesn't define `relations()` — no reason to add
 * that config just for this one read. `guildId` scopes the log to one
 * connected server once multi-server is in play (build_plan.md Phase 6).
 */
export async function listRecentInteractions(
  limit = 50,
  guildId?: string,
): Promise<InteractionWithActions[]> {
  const interactions = await db.query.interactions.findMany({
    where: guildId ? eq(schema.interactions.guildId, guildId) : undefined,
    orderBy: desc(schema.interactions.createdAt),
    limit,
  });
  if (interactions.length === 0) return [];

  const actions = await db.query.actions.findMany({
    where: inArray(
      schema.actions.interactionId,
      interactions.map((i) => i.id),
    ),
  });

  const actionsByInteraction = new Map<string, Action[]>();
  for (const action of actions) {
    const list = actionsByInteraction.get(action.interactionId) ?? [];
    list.push(action);
    actionsByInteraction.set(action.interactionId, list);
  }

  return interactions.map((interaction) => ({
    ...interaction,
    actions: actionsByInteraction.get(interaction.id) ?? [],
  }));
}

/**
 * Failed actions with just enough interaction context to be useful in the
 * dashboard (build_plan.md Phase 5 "visible failure/retry history") — kind,
 * attempts, last error detail, and which command/guild it belongs to.
 */
export async function listRecentFailures(
  limit = 20,
  guildId?: string,
): Promise<FailedAction[]> {
  return db
    .select({
      id: schema.actions.id,
      kind: schema.actions.kind,
      status: schema.actions.status,
      attempts: schema.actions.attempts,
      detail: schema.actions.detail,
      updatedAt: schema.actions.updatedAt,
      commandName: schema.interactions.commandName,
      guildId: schema.interactions.guildId,
    })
    .from(schema.actions)
    .innerJoin(
      schema.interactions,
      eq(schema.actions.interactionId, schema.interactions.id),
    )
    .where(
      and(
        eq(schema.actions.status, "failed"),
        guildId ? eq(schema.interactions.guildId, guildId) : undefined,
      ),
    )
    .orderBy(desc(schema.actions.updatedAt))
    .limit(limit);
}

export async function countInteractionsAndFailures(guildId?: string): Promise<{
  totalInteractions: number;
  failedActions: number;
}> {
  const interactionsWhere = guildId
    ? eq(schema.interactions.guildId, guildId)
    : undefined;

  const [interactions, actions] = await Promise.all([
    db.query.interactions.findMany({
      where: interactionsWhere,
      columns: { id: true },
    }),
    guildId
      ? db
          .select({ status: schema.actions.status })
          .from(schema.actions)
          .innerJoin(
            schema.interactions,
            eq(schema.actions.interactionId, schema.interactions.id),
          )
          .where(eq(schema.interactions.guildId, guildId))
      : db.query.actions.findMany({ columns: { status: true } }),
  ]);
  return {
    totalInteractions: interactions.length,
    failedActions: actions.filter((a) => a.status === "failed").length,
  };
}

export type ActionKindMetric = {
  kind: Action["kind"];
  success: number;
  failed: number;
  pending: number;
  total: number;
};

/**
 * Per-kind (`discord_reply`/`mirror`/`ai`) success/failed/pending breakdown
 * (build_plan.md Phase 6 "deeper observability"). One grouped query rather
 * than pulling every row client-side.
 */
export async function getActionMetricsByKind(
  guildId?: string,
): Promise<ActionKindMetric[]> {
  const rows = await db
    .select({
      kind: schema.actions.kind,
      status: schema.actions.status,
      count: count(),
    })
    .from(schema.actions)
    .innerJoin(
      schema.interactions,
      eq(schema.actions.interactionId, schema.interactions.id),
    )
    .where(guildId ? eq(schema.interactions.guildId, guildId) : undefined)
    .groupBy(schema.actions.kind, schema.actions.status);

  const byKind = new Map<Action["kind"], ActionKindMetric>();
  for (const row of rows) {
    const metric = byKind.get(row.kind) ?? {
      kind: row.kind,
      success: 0,
      failed: 0,
      pending: 0,
      total: 0,
    };
    metric[row.status] += row.count;
    metric.total += row.count;
    byKind.set(row.kind, metric);
  }
  return [...byKind.values()].sort((a, b) => a.kind.localeCompare(b.kind));
}

export type ActionLatency = Pick<
  Action,
  "id" | "kind" | "status" | "attempts" | "createdAt" | "updatedAt"
> & {
  commandName: string | null;
};

/**
 * Recent actions with an approximate "how long did this take / how many
 * retries" view (build_plan.md Phase 6 "retry timelines") — derived from the
 * existing `attempts`/`created_at`/`updated_at` columns rather than a new
 * per-attempt history table.
 */
export async function getRecentActionLatency(
  limit = 20,
  guildId?: string,
): Promise<ActionLatency[]> {
  return db
    .select({
      id: schema.actions.id,
      kind: schema.actions.kind,
      status: schema.actions.status,
      attempts: schema.actions.attempts,
      createdAt: schema.actions.createdAt,
      updatedAt: schema.actions.updatedAt,
      commandName: schema.interactions.commandName,
    })
    .from(schema.actions)
    .innerJoin(
      schema.interactions,
      eq(schema.actions.interactionId, schema.interactions.id),
    )
    .where(guildId ? eq(schema.interactions.guildId, guildId) : undefined)
    .orderBy(desc(schema.actions.updatedAt))
    .limit(limit);
}
