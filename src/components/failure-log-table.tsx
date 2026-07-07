import { Badge } from "@/components/ui/Badge";
import { Table, type TableColumn } from "@/components/ui/Table";
import { redact } from "@/server/lib/logger";
import type { FailedAction } from "@/server/db/dashboard-queries";

function errorDetail(detail: unknown): string {
  if (!detail || typeof detail !== "object") return "—";
  const redacted = redact(detail) as { error?: unknown };
  return typeof redacted.error === "string" ? redacted.error : "—";
}

const columns: TableColumn<FailedAction>[] = [
  {
    key: "time",
    header: "Last attempt",
    render: (row) => (
      <span className="text-muted-foreground text-xs">
        {new Date(row.updatedAt).toLocaleString()}
      </span>
    ),
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
    key: "kind",
    header: "Action",
    render: (row) => <span className="text-xs">{row.kind}</span>,
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
    key: "error",
    header: "Last error",
    render: (row) => (
      <span className="text-danger max-w-sm truncate text-xs">
        {errorDetail(row.detail)}
      </span>
    ),
  },
];

/** Failure/retry history panel (build_plan.md Phase 5, ui_registry.md). */
export function FailureLogTable({ rows }: { rows: FailedAction[] }) {
  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      empty="No failed actions — everything downstream is healthy."
    />
  );
}
