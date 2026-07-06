import { ActionStatusCell } from "@/components/action-status-cell";
import { Badge } from "@/components/ui/Badge";
import { Table, type TableColumn } from "@/components/ui/Table";
import type { InteractionWithActions } from "@/server/db/dashboard-queries";

function truncate(value: string | null, length = 10): string {
  if (!value) return "—";
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

const columns: TableColumn<InteractionWithActions>[] = [
  {
    key: "time",
    header: "Time",
    render: (row) => (
      <span className="text-muted-foreground text-xs">
        {new Date(row.createdAt).toLocaleString()}
      </span>
    ),
  },
  {
    key: "guild",
    header: "Guild",
    render: (row) => (
      <span className="font-mono text-xs" title={row.guildId ?? undefined}>
        {truncate(row.guildId)}
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
    key: "user",
    header: "User",
    render: (row) => (
      <span className="text-sm">{row.userName ?? truncate(row.userId)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <Badge status={row.status}>{row.status}</Badge>,
  },
  {
    key: "actions",
    header: "Action(s)",
    render: (row) => (
      <div className="flex flex-col gap-1">
        {row.actions.length === 0 ? (
          <span className="text-muted-foreground text-xs">none</span>
        ) : (
          row.actions.map((action) => (
            <ActionStatusCell key={action.id} action={action} />
          ))
        )}
      </div>
    ),
  },
  {
    key: "summary",
    header: "Summary",
    render: (row) => (
      <span className="text-muted-foreground max-w-xs truncate text-xs">
        {row.responseSummary ?? "—"}
      </span>
    ),
  },
];

/** Live log of interactions + actions (ui_rules.md §6). */
export function CommandLogTable({ rows }: { rows: InteractionWithActions[] }) {
  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      empty="No commands recorded yet — run /report or /status in your connected server."
    />
  );
}
