import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { updateCommandConfig } from "@/server/actions/command-configs";
import type { CommandConfig } from "@/server/db/schema";
import { ruleSchema } from "@/server/discord/rules";

/** Edit `command_configs.rule` (enabled, template, mirror/AI toggles) — Server Action submit. */
export function CommandConfigForm({ config }: { config: CommandConfig }) {
  const rule = ruleSchema.parse(config.rule);

  return (
    <Card title={`/${config.commandName}`}>
      <form action={updateCommandConfig} className="flex flex-col gap-4">
        <input type="hidden" name="guildId" value={config.guildId} />
        <input type="hidden" name="commandName" value={config.commandName} />

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={config.enabled}
            className="accent-primary size-4"
          />
          Enabled
        </label>

        <Textarea
          label="Response template"
          name="responseTemplate"
          defaultValue={rule.responseTemplate}
          placeholder="📩 Report received: {message}"
        />

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="mirrorEnabled"
            defaultChecked={rule.mirrorEnabled}
            className="accent-primary size-4"
          />
          Mirror to second channel
        </label>

        <label className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="aiEnabled"
            defaultChecked={rule.aiEnabled}
            disabled
            className="accent-primary size-4"
          />
          AI triage (stretch — not yet enabled)
        </label>

        <Button type="submit" size="sm" className="self-start">
          Save
        </Button>
      </form>
    </Card>
  );
}
