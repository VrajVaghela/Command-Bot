import "server-only";
import { and, eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Action } from "@/server/db/schema";

/**
 * Get-or-create + update-in-place for `actions` rows, keyed by the
 * `(interaction_id, kind)` unique constraint. This is the idempotency
 * guarantee for "duplicate delivery -> single action set": whichever call
 * gets there first creates the row; retries only ever update it.
 */
export async function ensureAction(
  interactionId: string,
  kind: Action["kind"],
): Promise<Action> {
  const inserted = await db
    .insert(schema.actions)
    .values({ interactionId, kind })
    .onConflictDoNothing({
      target: [schema.actions.interactionId, schema.actions.kind],
    })
    .returning();
  if (inserted[0]) return inserted[0];

  const existing = await db.query.actions.findFirst({
    where: and(
      eq(schema.actions.interactionId, interactionId),
      eq(schema.actions.kind, kind),
    ),
  });
  if (!existing) {
    // Unreachable in practice: the insert only no-ops on a conflict with an
    // existing row, so a lookup for that exact key must find it.
    throw new Error(`actions row missing for ${interactionId}/${kind}`);
  }
  return existing;
}

export async function recordActionAttempt(
  actionId: string,
  patch: { status: Action["status"]; attempts: number; detail?: unknown },
): Promise<void> {
  await db
    .update(schema.actions)
    .set({
      status: patch.status,
      attempts: patch.attempts,
      detail: patch.detail ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.actions.id, actionId));
}
