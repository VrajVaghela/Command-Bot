import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type CardProps = {
  title?: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Raised surface for panels/tiles (ui_rules.md §4). */
export function Card({
  title,
  description,
  footer,
  children,
  className,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground border-border rounded-[var(--radius)] border p-6 shadow-sm",
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
        </div>
      )}
      {children}
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
