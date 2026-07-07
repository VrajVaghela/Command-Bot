import { Card } from "@/components/ui/Card";
import type { ActionKindMetric } from "@/server/db/dashboard-queries";

const SEGMENTS: Array<{
  key: keyof Pick<ActionKindMetric, "success" | "pending" | "failed">;
  barClass: string;
  textClass: string;
  label: string;
}> = [
  {
    key: "success",
    barClass: "bg-success",
    textClass: "text-success",
    label: "success",
  },
  {
    key: "pending",
    barClass: "bg-warning",
    textClass: "text-warning",
    label: "pending",
  },
  {
    key: "failed",
    barClass: "bg-danger",
    textClass: "text-danger",
    label: "failed",
  },
];

/** One kind's proportional success/pending/failed bar — status colors only, never categorical hues. */
function KindBar({ metric }: { metric: ActionKindMetric }) {
  const total = metric.total || 1; // guard divide-by-zero; bar just renders empty
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium">{metric.kind}</p>
        <p className="text-muted-foreground text-xs">{metric.total} total</p>
      </div>
      <div className="bg-muted flex h-2 gap-0.5 overflow-hidden rounded-full">
        {SEGMENTS.map(
          (segment) =>
            metric[segment.key] > 0 && (
              <div
                key={segment.key}
                className={`${segment.barClass} h-full rounded-full`}
                style={{ width: `${(metric[segment.key] / total) * 100}%` }}
              />
            ),
        )}
      </div>
      <div className="mt-2 flex gap-3 text-xs">
        {SEGMENTS.map((segment) => (
          <span key={segment.key} className={segment.textClass}>
            {metric[segment.key]} {segment.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

/** Per-kind (discord_reply/mirror/ai) success/pending/failed breakdown (build_plan.md Phase 6). */
export function MetricsByKindPanel({
  metrics,
}: {
  metrics: ActionKindMetric[];
}) {
  if (metrics.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No actions recorded yet.</p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map((metric) => (
        <KindBar key={metric.kind} metric={metric} />
      ))}
    </div>
  );
}
