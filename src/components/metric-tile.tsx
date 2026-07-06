import { Card } from "@/components/ui/Card";

/** Dashboard hero metric (ui_registry.md) — reuses Card. */
export function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
    </Card>
  );
}
