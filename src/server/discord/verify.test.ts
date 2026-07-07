import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrivateKey, sign } from "node:crypto";

import { verifyDiscordRequest } from "./verify";

/**
 * Paired with DISCORD_PUBLIC_KEY in `.env.test` — a throwaway keypair used
 * only to sign requests in this test file, never a real Discord app's key.
 */
const TEST_PRIVATE_KEY = createPrivateKey({
  key: {
    kty: "OKP",
    crv: "Ed25519",
    x: "SsXTPtWlmr9yzD_e5SyHYhRa1GlymhALmFPqWpGWkN4",
    d: "FSdM_xE0ARjUsXXZmNOnUfesAHMB79W5-bDQdihI0Dw",
  },
  format: "jwk",
});

function signRequest(timestamp: string, rawBody: string): string {
  const message = Buffer.concat([
    Buffer.from(timestamp, "utf8"),
    Buffer.from(rawBody, "utf8"),
  ]);
  return sign(null, message, TEST_PRIVATE_KEY).toString("hex");
}

function freshTimestamp(): string {
  return String(Math.floor(Date.now() / 1000));
}

test("verifyDiscordRequest: valid signature is accepted", async () => {
  const timestamp = freshTimestamp();
  const body = JSON.stringify({ type: 1 });
  const signature = signRequest(timestamp, body);

  assert.equal(await verifyDiscordRequest(body, signature, timestamp), true);
});

test("verifyDiscordRequest: forged signature is rejected", async () => {
  const timestamp = freshTimestamp();
  const body = JSON.stringify({ type: 1 });
  const forgedSignature = "00".repeat(64);

  assert.equal(
    await verifyDiscordRequest(body, forgedSignature, timestamp),
    false,
  );
});

test("verifyDiscordRequest: tampered body is rejected", async () => {
  const timestamp = freshTimestamp();
  const signedBody = JSON.stringify({ type: 1 });
  const signature = signRequest(timestamp, signedBody);
  const tamperedBody = JSON.stringify({ type: 1, extra: "injected" });

  assert.equal(
    await verifyDiscordRequest(tamperedBody, signature, timestamp),
    false,
  );
});

test("verifyDiscordRequest: missing signature header is rejected", async () => {
  const timestamp = freshTimestamp();
  const body = JSON.stringify({ type: 1 });

  assert.equal(await verifyDiscordRequest(body, null, timestamp), false);
});

test("verifyDiscordRequest: missing timestamp header is rejected", async () => {
  const body = JSON.stringify({ type: 1 });
  const signature = signRequest(freshTimestamp(), body);

  assert.equal(await verifyDiscordRequest(body, signature, null), false);
});

test("verifyDiscordRequest: stale (replayed) timestamp is rejected", async () => {
  const staleTimestamp = String(Math.floor(Date.now() / 1000) - 3600); // 1h old
  const body = JSON.stringify({ type: 1 });
  const signature = signRequest(staleTimestamp, body);

  // The signature is genuinely valid for this exact (stale) timestamp+body —
  // proving the freshness check, not the crypto check, is what rejects this.
  assert.equal(
    await verifyDiscordRequest(body, signature, staleTimestamp),
    false,
  );
});

test("verifyDiscordRequest: malformed timestamp is rejected", async () => {
  const body = JSON.stringify({ type: 1 });
  const signature = signRequest("not-a-number", body);

  assert.equal(
    await verifyDiscordRequest(body, signature, "not-a-number"),
    false,
  );
});
