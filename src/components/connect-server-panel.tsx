"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SecretInput } from "@/components/ui/SecretInput";
import { Select } from "@/components/ui/Select";
import {
  fetchChannelsAction,
  saveGuildConnection,
} from "@/server/actions/guilds";
import type { GuildChannel } from "@/server/discord/channels";
import type { Guild } from "@/server/db/schema";

/** Bot invite link + pick post channel + mirror target (ui_registry.md). */
export function ConnectServerPanel({
  existingGuild,
  inviteUrl,
}: {
  existingGuild?: Guild;
  inviteUrl: string;
}) {
  const [guildId, setGuildId] = useState(existingGuild?.id ?? "");
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [fetchError, setFetchError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const handleFetchChannels = () => {
    setFetchError(undefined);
    startTransition(async () => {
      const result = await fetchChannelsAction(guildId);
      if (result.ok) {
        setChannels(result.value);
      } else {
        setChannels([]);
        setFetchError(result.error);
      }
    });
  };

  const channelOptions = channels.map((c) => ({
    value: c.id,
    label: `#${c.name}`,
  }));
  if (
    existingGuild?.postChannelId &&
    !channels.some((c) => c.id === existingGuild.postChannelId)
  ) {
    channelOptions.unshift({
      value: existingGuild.postChannelId,
      label: `Current channel (${existingGuild.postChannelId})`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium">1. Invite the bot</p>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary text-sm break-all underline"
        >
          {inviteUrl}
        </a>
      </div>

      <form action={saveGuildConnection} className="flex flex-col gap-4">
        <p className="text-sm font-medium">2. Connect the server</p>
        <Input
          label="Guild ID"
          name="guildId"
          mono
          required
          value={guildId}
          onChange={(e) => setGuildId(e.target.value)}
        />
        <Input
          label="Server name (label only)"
          name="name"
          required
          defaultValue={existingGuild?.name}
        />

        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={pending}
            onClick={handleFetchChannels}
          >
            Fetch channels
          </Button>
          {fetchError && <p className="text-danger text-xs">{fetchError}</p>}
        </div>

        <Select
          key={channelOptions.length}
          label="Post channel"
          name="postChannelId"
          required
          options={channelOptions}
          placeholder={
            channelOptions.length === 0
              ? "Fetch channels first"
              : "Choose a channel"
          }
          defaultValue={existingGuild?.postChannelId ?? ""}
        />

        <Select
          label="Mirror type"
          name="mirrorType"
          options={[
            { value: "discord", label: "Discord channel webhook" },
            { value: "slack", label: "Slack Incoming Webhook" },
          ]}
          defaultValue={existingGuild?.mirrorType ?? "discord"}
        />

        <SecretInput
          label="Mirror webhook URL"
          name="mirrorWebhookUrl"
          placeholder={
            existingGuild?.mirrorWebhookUrl
              ? "•••• (unchanged — leave blank to keep)"
              : "https://hooks.slack.com/... or a Discord webhook URL"
          }
        />

        <Button type="submit" className="self-start">
          Save
        </Button>
      </form>
    </div>
  );
}
