import { test } from "node:test";
import assert from "node:assert/strict";
import { InteractionResponseType } from "discord-interactions";

import { pong, channelMessage, deferredChannelMessage } from "./respond";

test("pong: answers PING with PONG", () => {
  assert.deepEqual(pong(), { type: InteractionResponseType.PONG });
});

test("channelMessage: builds an immediate reply", () => {
  assert.deepEqual(channelMessage("hello"), {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: "hello" },
  });
});

test("channelMessage: ephemeral flag is set when requested", () => {
  const result = channelMessage("hello", true);
  assert.equal(result.data.flags, 64);
});

test("channelMessage: ephemeral flag is absent by default", () => {
  const result = channelMessage("hello");
  assert.equal("flags" in result.data, false);
});

test("deferredChannelMessage: acks without content, resolved later via follow-up", () => {
  assert.deepEqual(deferredChannelMessage(), {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  });
});
