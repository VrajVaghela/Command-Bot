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
