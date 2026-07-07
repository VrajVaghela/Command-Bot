import { test } from "node:test";
import assert from "node:assert/strict";

import { triageReport, parseTriageResponse } from "./gemini";

test("triageReport: disabled by default (no AI_ENABLED/GEMINI_API_KEY in .env.test) never calls the network", async () => {
  const result = await triageReport("someone is spamming the general channel");
  assert.deepEqual(result, { ok: false, error: "ai disabled" });
});

test("parseTriageResponse: valid json -> ok with summary + tags", () => {
  const result = parseTriageResponse(
    JSON.stringify({ summary: "Spam report", tags: ["spam", "channel"] }),
  );
  assert.deepEqual(result, {
    ok: true,
    value: { summary: "Spam report", tags: ["spam", "channel"] },
  });
});

test("parseTriageResponse: missing tags defaults to an empty array", () => {
  const result = parseTriageResponse(
    JSON.stringify({ summary: "Spam report" }),
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.tags, []);
});

test("parseTriageResponse: undefined text -> err, never throws", () => {
  const result = parseTriageResponse(undefined);
  assert.deepEqual(result, { ok: false, error: "gemini returned no text" });
});

test("parseTriageResponse: non-JSON text -> err, never throws", () => {
  const result = parseTriageResponse("not json at all");
  assert.deepEqual(result, {
    ok: false,
    error: "gemini returned malformed json",
  });
});

test("parseTriageResponse: JSON missing required 'summary' field -> err", () => {
  const result = parseTriageResponse(JSON.stringify({ tags: ["spam"] }));
  assert.deepEqual(result, {
    ok: false,
    error: "gemini returned malformed json",
  });
});

test("parseTriageResponse: empty summary string -> err (schema requires min length 1)", () => {
  const result = parseTriageResponse(JSON.stringify({ summary: "" }));
  assert.deepEqual(result, {
    ok: false,
    error: "gemini returned malformed json",
  });
});
