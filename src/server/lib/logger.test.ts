import { test } from "node:test";
import assert from "node:assert/strict";

import { redact } from "./logger";

test("redact: replaces secret-named keys regardless of value shape", () => {
  const result = redact({
    botToken: "abc123",
    webhookUrl: "https://discord.com/api/webhooks/1/2",
    password: "hunter2",
    guildId: "123456789",
  }) as Record<string, unknown>;

  assert.equal(result.botToken, "[REDACTED]");
  assert.equal(result.webhookUrl, "[REDACTED]");
  assert.equal(result.password, "[REDACTED]");
  assert.equal(result.guildId, "123456789");
});

test("redact: scrubs a Discord webhook URL embedded in a plain string", () => {
  const result = redact({
    message:
      "mirror failed: https://discord.com/api/webhooks/111/tokentokentoken",
  }) as Record<string, unknown>;

  assert.equal(result.message, "mirror failed: [REDACTED]");
});

test("redact: scrubs a Slack webhook URL embedded in a plain string", () => {
  const result = redact({
    message:
      "https://hooks.slack.com/services/T000/B000/xxxxxxxxxxxxxxxxxxxxxxxx",
  }) as Record<string, unknown>;

  assert.equal(result.message, "[REDACTED]");
});

test("redact: scrubs a Postgres connection string", () => {
  const result = redact({
    error: "connect failed: postgresql://user:pw@ep-xxxx.neon.tech/db",
  }) as Record<string, unknown>;

  assert.equal(result.error, "connect failed: [REDACTED]");
});

test("redact: leaves non-secret context untouched", () => {
  const result = redact({
    interactionId: "abc",
    attempts: 2,
    nested: { commandName: "report" },
  }) as Record<string, unknown>;

  assert.deepEqual(result, {
    interactionId: "abc",
    attempts: 2,
    nested: { commandName: "report" },
  });
});
