import { CommandLogTable } from "@/components/command-log-table";
import { LiveLogPoller } from "@/components/live-log-poller";
import { MetricTile } from "@/components/metric-tile";
import {
  countInteractionsAndFailures,
  listRecentInteractions,
} from "@/server/db/dashboard-queries";

// Live log needs fresh data on every poll (`LiveLogPoller`), not a cached RSC payload.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [rows, metrics] = await Promise.all([
    listRecentInteractions(50),
    countInteractionsAndFailures(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <LiveLogPoller />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricTile
          label="Total interactions"
          value={metrics.totalInteractions}
        />
        <MetricTile label="Failed actions" value={metrics.failedActions} />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Live command/action log</h2>
        <CommandLogTable rows={rows} />
      </div>
    </div>
  );
}
