import { test } from "node:test";
import assert from "node:assert/strict";

import { withRetry } from "./retry";
import { ok, err } from "@/lib/result";

test("withRetry: returns immediately on first-attempt success", async () => {
  let calls = 0;
  const attempts: number[] = [];

  const result = await withRetry(
    async () => {
      calls += 1;
      return ok("done");
    },
    { onAttempt: async (n) => void attempts.push(n) },
  );

  assert.deepEqual(result, { ok: true, value: "done" });
  assert.equal(calls, 1);
  assert.deepEqual(attempts, [1]);
});

test("withRetry: retries after a failure and succeeds", async () => {
  let calls = 0;

  const result = await withRetry(
    async () => {
      calls += 1;
      return calls < 2 ? err("transient") : ok("recovered");
    },
    { maxRetries: 3, baseDelayMs: 1 },
  );

  assert.deepEqual(result, { ok: true, value: "recovered" });
  assert.equal(calls, 2);
});

test("withRetry: exhausts maxRetries and returns the last failure — no data loss, just recorded as failed", async () => {
  let calls = 0;
  const attemptResults: boolean[] = [];

  const result = await withRetry(
    async () => {
      calls += 1;
      return err(`failure #${calls}`);
    },
    {
      maxRetries: 3,
      baseDelayMs: 1,
      onAttempt: async (_n, r) => void attemptResults.push(r.ok),
    },
  );

  assert.equal(result.ok, false);
  assert.equal(calls, 3);
  assert.deepEqual(attemptResults, [false, false, false]);
  if (!result.ok) assert.equal(result.error, "failure #3");
});

test("withRetry: onAttempt is called with the correct attempt number every time", async () => {
  const seenAttemptNumbers: number[] = [];

  await withRetry(async () => err("nope"), {
    maxRetries: 3,
    baseDelayMs: 1,
    onAttempt: async (n) => void seenAttemptNumbers.push(n),
  });

  assert.deepEqual(seenAttemptNumbers, [1, 2, 3]);
});

test("withRetry: a thrown error inside the attempt is treated as a failure, not an unhandled rejection", async () => {
  const result = await withRetry(
    async () => {
      throw new Error("boom");
    },
    { maxRetries: 1 },
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "boom");
});
