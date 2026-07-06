import "server-only";
import { InteractionResponseType } from "discord-interactions";

/** Discord interaction response builders (architecture.md §4, library_docs.md §1). */

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
