import { Badge } from "@/components/ui/Badge";
import { Table, type TableColumn } from "@/components/ui/Table";
import type { ActionLatency } from "@/server/db/dashboard-queries";

function formatLatency(createdAt: Date, updatedAt: Date): string {
  const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const columns: TableColumn<ActionLatency>[] = [
  {
    key: "kind",
    header: "Kind",
    render: (row) => <span className="text-xs">{row.kind}</span>,
  },
  {
    key: "command",
    header: "Command",
    render: (row) => (
      <span className="text-sm font-medium">
        {row.commandName ? `/${row.commandName}` : "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="flex items-center gap-2">
        <Badge status={row.status}>{row.status}</Badge>
        <span className="text-muted-foreground text-xs">×{row.attempts}</span>
      </div>
    ),
  },
  {
    key: "latency",
    header: "Latency",
    render: (row) => (
      <span className="text-muted-foreground text-xs">
        {formatLatency(row.createdAt, row.updatedAt)}
      </span>
    ),
  },
];

/**
 * Approximate retry-timeline view (build_plan.md Phase 6 "deeper
 * observability") — latency derived from `created_at`/`updated_at`, attempts
 * from the existing counter. No new per-attempt history table.
 */
export function ActionLatencyTable({ rows }: { rows: ActionLatency[] }) {
  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      empty="No actions recorded yet."
    />
  );
}
