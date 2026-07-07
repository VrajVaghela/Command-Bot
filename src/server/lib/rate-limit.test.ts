import { test } from "node:test";
import assert from "node:assert/strict";

import { checkRateLimit, resetRateLimits } from "./rate-limit";

test("checkRateLimit: allows requests under the limit", () => {
  resetRateLimits();
  let clock = 1_000;
  const now = () => clock;

  assert.equal(checkRateLimit("ip-a", 3, 10_000, now), true);
  clock += 1;
  assert.equal(checkRateLimit("ip-a", 3, 10_000, now), true);
  clock += 1;
  assert.equal(checkRateLimit("ip-a", 3, 10_000, now), true);
});

test("checkRateLimit: blocks once the limit is exceeded within the window", () => {
  resetRateLimits();
  let clock = 1_000;
  const now = () => clock;

  checkRateLimit("ip-b", 2, 10_000, now);
  clock += 1;
  checkRateLimit("ip-b", 2, 10_000, now);
  clock += 1;
  assert.equal(checkRateLimit("ip-b", 2, 10_000, now), false);
});

test("checkRateLimit: resets after the window elapses", () => {
  resetRateLimits();
  let clock = 1_000;
  const now = () => clock;

  checkRateLimit("ip-c", 1, 10_000, now);
  assert.equal(checkRateLimit("ip-c", 1, 10_000, now), false);

  clock += 10_001;
  assert.equal(checkRateLimit("ip-c", 1, 10_000, now), true);
});

test("checkRateLimit: keys are independent of each other", () => {
  resetRateLimits();
  const now = () => 5_000;

  checkRateLimit("ip-d", 1, 10_000, now);
  assert.equal(checkRateLimit("ip-d", 1, 10_000, now), false);
  assert.equal(checkRateLimit("ip-e", 1, 10_000, now), true);
});
