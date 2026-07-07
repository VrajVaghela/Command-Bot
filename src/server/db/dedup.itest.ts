import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";

/**
 * Runs against the real dev Neon DB via `.env.local` (`npm run test:integration`).
 * Proves "duplicate delivery → processed once" directly against the unique
 * constraint the interactions route relies on
 * (`onConflictDoNothing({ target: schema.interactions.id })`), rather than
 * against a hand-rolled fake of it.
 */
test("interactions: onConflictDoNothing makes a repeated interaction id a no-op", async () => {
  const interactionId = `itest-dedup-${crypto.randomUUID()}`;

  try {
    const first = await db
      .insert(schema.interactions)
      .values({
        id: interactionId,
        type: 2,
        commandName: "status",
        status: "processed",
        responseSummary: "first delivery",
      })
      .onConflictDoNothing({ target: schema.interactions.id })
      .returning({ responseSummary: schema.interactions.responseSummary });

    assert.equal(first.length, 1);
    assert.equal(first[0]?.responseSummary, "first delivery");

    // Same interaction id delivered again (Discord retry / attacker replay).
    const second = await db
      .insert(schema.interactions)
      .values({
        id: interactionId,
        type: 2,
        commandName: "status",
        status: "processed",
        responseSummary: "second delivery — must not win",
      })
      .onConflictDoNothing({ target: schema.interactions.id })
      .returning({ responseSummary: schema.interactions.responseSummary });

    assert.equal(second.length, 0);

    const rows = await db.query.interactions.findMany({
      where: eq(schema.interactions.id, interactionId),
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.responseSummary, "first delivery");
  } finally {
    await db
      .delete(schema.interactions)
      .where(eq(schema.interactions.id, interactionId));
  }
});
