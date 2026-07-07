import { Badge } from "@/components/ui/Badge";
import { redact } from "@/server/lib/logger";
import type { Action } from "@/server/db/schema";

function errorDetail(detail: unknown): string | undefined {
  if (!detail || typeof detail !== "object") return undefined;
  const redacted = redact(detail) as { error?: unknown };
  return typeof redacted.error === "string" ? redacted.error : undefined;
}

/** Renders one action's kind + status Badge + attempts (ui_registry.md). */
export function ActionStatusCell({ action }: { action: Action }) {
  const error =
    action.status === "failed" ? errorDetail(action.detail) : undefined;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium">{action.kind}</span>
      <span title={error} className={error ? "cursor-help" : undefined}>
        <Badge status={action.status}>{action.status}</Badge>
      </span>
      {action.attempts > 0 && (
        <span className="text-muted-foreground text-xs">
          ×{action.attempts}
        </span>
      )}
    </div>
  );
}
