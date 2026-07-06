import { Badge } from "@/components/ui/Badge";
import type { Action } from "@/server/db/schema";

/** Renders one action's kind + status Badge + attempts (ui_registry.md). */
export function ActionStatusCell({ action }: { action: Action }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium">{action.kind}</span>
      <Badge status={action.status}>{action.status}</Badge>
      {action.attempts > 0 && (
        <span className="text-muted-foreground text-xs">
          ×{action.attempts}
        </span>
      )}
    </div>
  );
}
