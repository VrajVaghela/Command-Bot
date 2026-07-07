/**
 * Slash command definitions — the single source of truth consumed by
 * `scripts/register-commands.ts` (registration) and the interactions route
 * (dispatch by name). Discord's numeric option type 3 = STRING; the
 * `discord-interactions` package doesn't export `ApplicationCommandOptionType`,
 * so it's spelled out here per the Discord API docs.
 */

const APPLICATION_COMMAND_OPTION_TYPE_STRING = 3;

export const REPORT_COMMAND = "report";
export const STATUS_COMMAND = "status";

// Custom IDs for the button -> modal follow-up flow (build_plan.md Phase 6
// "interactive components" + "modal form"). Namespaced strings, not enums,
// since Discord only ever gives these back to us as opaque strings.
export const REPORT_AGAIN_BUTTON_ID = "report_again";
export const REPORT_MODAL_ID = "report_modal";
export const REPORT_MODAL_MESSAGE_INPUT_ID = "message";

export const commandDefinitions = [
  {
    name: STATUS_COMMAND,
    description: "Check that the bot is online and receiving commands.",
  },
  {
    name: REPORT_COMMAND,
    description: "File a report.",
    options: [
      {
        type: APPLICATION_COMMAND_OPTION_TYPE_STRING,
        name: "message",
        description: "What are you reporting?",
        required: true,
      },
    ],
  },
] as const;
