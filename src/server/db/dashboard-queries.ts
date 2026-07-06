import "server-only";
import { desc, inArray } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Action, Interaction } from "@/server/db/schema";

export type InteractionWithActions = Interaction & { actions: Action[] };

/**
 * Recent interactions + their actions for the live log (build_plan.md Phase
 * 4). Two flat queries + an in-memory join rather than a Drizzle relational
 * query, since `schema.ts` doesn't define `relations()` — no reason to add
 * that config just for this one read.
 */
export async function listRecentInteractions(
  limit = 50,
): Promise<InteractionWithActions[]> {
  const interactions = await db.query.interactions.findMany({
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

export async function countInteractionsAndFailures(): Promise<{
  totalInteractions: number;
  failedActions: number;
}> {
  const [interactions, actions] = await Promise.all([
    db.query.interactions.findMany({ columns: { id: true } }),
    db.query.actions.findMany({ columns: { status: true } }),
  ]);
  return {
    totalInteractions: interactions.length,
    failedActions: actions.filter((a) => a.status === "failed").length,
  };
}
