import "server-only";
import { InteractionResponseType } from "discord-interactions";

import {
  REPORT_AGAIN_BUTTON_ID,
  REPORT_MODAL_ID,
  REPORT_MODAL_MESSAGE_INPUT_ID,
} from "@/server/discord/commands";

/**
 * Discord interaction response builders (architecture.md §4, library_docs.md
 * §1). `discord-interactions` doesn't export message-component/modal type
 * constants, so — same as `commands.ts` does for the option type — they're
 * spelled out here per the Discord API docs.
 */

const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_BUTTON = 2;
const COMPONENT_TYPE_TEXT_INPUT = 4;
const BUTTON_STYLE_SECONDARY = 2;
const TEXT_INPUT_STYLE_PARAGRAPH = 2;

export function pong() {
  return { type: InteractionResponseType.PONG };
}

export function channelMessage(content: string, ephemeral = false) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      ...(ephemeral ? { flags: 64 } : {}),
    },
  };
}

/** Ack now, resolve later via `followup.ts` (library_docs.md §1, ~3s window). */
export function deferredChannelMessage() {
  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  };
}

/** Edits the message a component interaction was attached to (response type 7). */
export function updateMessage(content: string) {
  return {
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: { content },
  };
}

/** Opens a modal in response to a command or component interaction (response type 9). */
export function modal(customId: string, title: string, components: unknown) {
  return {
    type: InteractionResponseType.MODAL,
    data: { custom_id: customId, title, components },
  };
}

/** The "File another report" button row attached to the /report follow-up. */
export function reportAgainButtonRow() {
  return {
    type: COMPONENT_TYPE_ACTION_ROW,
    components: [
      {
        type: COMPONENT_TYPE_BUTTON,
        style: BUTTON_STYLE_SECONDARY,
        label: "📝 File another report",
        custom_id: REPORT_AGAIN_BUTTON_ID,
      },
    ],
  };
}

/** The modal shown after clicking the "File another report" button. */
export function reportModal() {
  return modal(REPORT_MODAL_ID, "File a report", [
    {
      type: COMPONENT_TYPE_ACTION_ROW,
      components: [
        {
          type: COMPONENT_TYPE_TEXT_INPUT,
          custom_id: REPORT_MODAL_MESSAGE_INPUT_ID,
          style: TEXT_INPUT_STYLE_PARAGRAPH,
          label: "What are you reporting?",
          required: true,
          max_length: 4000,
        },
      ],
    },
  ]);
}
