import { test } from "node:test";
import assert from "node:assert/strict";
import { InteractionResponseType } from "discord-interactions";

import {
  pong,
  channelMessage,
  deferredChannelMessage,
  updateMessage,
  modal,
  reportAgainButtonRow,
  reportModal,
} from "./respond";
import {
  REPORT_AGAIN_BUTTON_ID,
  REPORT_MODAL_ID,
  REPORT_MODAL_MESSAGE_INPUT_ID,
} from "./commands";

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

test("updateMessage: edits the message a component was attached to (type 7)", () => {
  assert.deepEqual(updateMessage("updated"), {
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: { content: "updated" },
  });
});

test("modal: opens a modal with the given custom_id/title/components (type 9)", () => {
  const components = [{ type: 1, components: [] }];
  assert.deepEqual(modal("my_modal", "My Modal", components), {
    type: InteractionResponseType.MODAL,
    data: { custom_id: "my_modal", title: "My Modal", components },
  });
});

test("reportAgainButtonRow: builds a single button row with the shared custom_id", () => {
  const row = reportAgainButtonRow();
  assert.equal(row.type, 1); // action row
  assert.equal(row.components.length, 1);
  const button = row.components[0];
  assert.ok(button);
  assert.equal(button.type, 2); // button
  assert.equal(button.custom_id, REPORT_AGAIN_BUTTON_ID);
});

test("reportModal: opens the report modal with a required text input", () => {
  const result = reportModal();
  assert.equal(result.type, InteractionResponseType.MODAL);
  assert.equal(result.data.custom_id, REPORT_MODAL_ID);
  const components = result.data.components as Array<{
    components: Array<{ custom_id: string; required?: boolean }>;
  }>;
  const [row] = components;
  assert.ok(row);
  const textInput = row.components[0];
  assert.ok(textInput);
  assert.equal(textInput.custom_id, REPORT_MODAL_MESSAGE_INPUT_ID);
  assert.equal(textInput.required, true);
});
