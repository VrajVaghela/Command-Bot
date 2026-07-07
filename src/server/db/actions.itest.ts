import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import { ensureAction, recordActionAttempt } from "@/server/db/actions";

/**
 * Runs against the real dev Neon DB via `.env.local` (`npm run test:integration`
 * — opt-in, not part of `npm test`). Covers "duplicate delivery → single
 * action set" (build_plan.md Phase 3/5) at the actual DB layer, since faking
 * Drizzle's query builder well enough to trust the result isn't worth it.
 */

async function withTestInteraction<T>(
  fn: (interactionId: string) => Promise<T>,
): Promise<T> {
  const interactionId = `itest-actions-${crypto.randomUUID()}`;
  await db
    .insert(schema.interactions)
    .values({ id: interactionId, type: 2, status: "processed" });
  try {
    return await fn(interactionId);
  } finally {
    await db
      .delete(schema.interactions)
      .where(eq(schema.interactions.id, interactionId));
  }
}

test("ensureAction: get-or-create is idempotent for the same (interaction, kind)", async () => {
  await withTestInteraction(async (interactionId) => {
    const first = await ensureAction(interactionId, "mirror");
    const second = await ensureAction(interactionId, "mirror");

    assert.equal(first.id, second.id);
    assert.equal(first.status, "pending");
    assert.equal(first.attempts, 0);
  });
});

test("ensureAction: different kinds for the same interaction get separate rows", async () => {
  await withTestInteraction(async (interactionId) => {
    const mirror = await ensureAction(interactionId, "mirror");
    const reply = await ensureAction(interactionId, "discord_reply");

    assert.notEqual(mirror.id, reply.id);
  });
});

test("recordActionAttempt: persists status/attempts/detail — visible retry history", async () => {
  await withTestInteraction(async (interactionId) => {
    const action = await ensureAction(interactionId, "mirror");

    await recordActionAttempt(action.id, {
      status: "failed",
      attempts: 1,
      detail: { error: "mirror webhook failed: 500" },
    });

    const afterFirstAttempt = await db.query.actions.findFirst({
      where: eq(schema.actions.id, action.id),
    });
    assert.equal(afterFirstAttempt?.status, "failed");
    assert.equal(afterFirstAttempt?.attempts, 1);

    // Simulates a successful retry — no data loss, the row is updated in place.
    await recordActionAttempt(action.id, {
      status: "success",
      attempts: 2,
      detail: { ok: true },
    });

    const afterRetry = await db.query.actions.findFirst({
      where: eq(schema.actions.id, action.id),
    });
    assert.equal(afterRetry?.status, "success");
    assert.equal(afterRetry?.attempts, 2);
  });
});
