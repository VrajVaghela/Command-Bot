import { CommandLogTable } from "@/components/command-log-table";
import { FailureLogTable } from "@/components/failure-log-table";
import { LiveLogPoller } from "@/components/live-log-poller";
import { MetricTile } from "@/components/metric-tile";
import { RetryFailedActionsButton } from "@/components/retry-failed-actions-button";
import {
  countInteractionsAndFailures,
  listRecentFailures,
  listRecentInteractions,
} from "@/server/db/dashboard-queries";

// Live log needs fresh data on every poll (`LiveLogPoller`), not a cached RSC payload.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [rows, metrics, failures] = await Promise.all([
    listRecentInteractions(50),
    countInteractionsAndFailures(),
    listRecentFailures(20),
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
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Failures &amp; retries</h2>
          <RetryFailedActionsButton />
        </div>
        <FailureLogTable rows={failures} />
      </div>
    </div>
  );
}
