import { cn } from "@/lib/cn";

const sizeClasses = {
  sm: "size-3.5 border-2",
  md: "size-5 border-2",
} as const;

/** Inline loading indicator (ui_rules.md §2) — reduced-motion aware. */
export function Spinner({
  size = "md",
  className,
}: {
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent motion-reduce:animate-none",
        sizeClasses[size],
        className,
      )}
    />
  );
}
