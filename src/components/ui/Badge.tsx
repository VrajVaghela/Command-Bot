import { cn } from "@/lib/cn";

/**
 * Status → semantic token mapping (ui_rules.md §5) — the single source of
 * truth for how `interactions.status` / `actions.status` read at a glance.
 */
export type BadgeStatus =
  "received" | "processed" | "success" | "pending" | "failed";

const statusClasses: Record<BadgeStatus, string> = {
  received: "bg-info/15 text-info",
  processed: "bg-success/15 text-success",
  success: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  failed: "bg-danger/15 text-danger",
};

export function Badge({
  status,
  children,
  className,
}: {
  status: BadgeStatus;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium",
        statusClasses[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
