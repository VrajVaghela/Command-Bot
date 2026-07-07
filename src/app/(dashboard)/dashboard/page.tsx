import { ActionLatencyTable } from "@/components/action-latency-table";
import { CommandLogTable } from "@/components/command-log-table";
import { FailureLogTable } from "@/components/failure-log-table";
import { GuildSwitcher } from "@/components/guild-switcher";
import { LiveLogPoller } from "@/components/live-log-poller";
import { MetricTile } from "@/components/metric-tile";
import { MetricsByKindPanel } from "@/components/metrics-by-kind-panel";
import { RetryFailedActionsButton } from "@/components/retry-failed-actions-button";
import {
  countInteractionsAndFailures,
  getActionMetricsByKind,
  getRecentActionLatency,
  listRecentFailures,
  listRecentInteractions,
} from "@/server/db/dashboard-queries";
import { listConnectedGuilds } from "@/server/db/guilds";

// Live log needs fresh data on every poll (`LiveLogPoller`), not a cached RSC payload.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const [guilds, { guild: requestedGuildId }] = await Promise.all([
    listConnectedGuilds(),
    searchParams,
  ]);
  const guildId =
    guilds.find((g) => g.id === requestedGuildId)?.id ?? guilds[0]?.id;

  const [rows, metrics, failures, kindMetrics, latency] = await Promise.all([
    listRecentInteractions(50, guildId),
    countInteractionsAndFailures(guildId),
    listRecentFailures(20, guildId),
    getActionMetricsByKind(guildId),
    getRecentActionLatency(20, guildId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <LiveLogPoller />
      <div className="flex items-center justify-end">
        {guildId && <GuildSwitcher guilds={guilds} selectedGuildId={guildId} />}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricTile
          label="Total interactions"
          value={metrics.totalInteractions}
        />
        <MetricTile label="Failed actions" value={metrics.failedActions} />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Actions by kind</h2>
        <MetricsByKindPanel metrics={kindMetrics} />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Live command/action log</h2>
        <CommandLogTable rows={rows} />
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Failures &amp; retries</h2>
          <RetryFailedActionsButton />
        </div>
        <FailureLogTable rows={failures} />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent action latency</h2>
        <ActionLatencyTable rows={latency} />
      </div>
    </div>
  );
}
