import { type TextareaHTMLAttributes, forwardRef, useId } from "react";

import { cn } from "@/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

/** Multi-line input with label + inline error (ui_rules.md §3). */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-foreground text-sm font-medium"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={!!error}
          className={cn(
            "bg-input rounded-[var(--radius-sm)] border px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:ring-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:outline-none",
            error ? "border-danger" : "border-border",
            className,
          )}
          {...props}
        />
        {error && <p className="text-danger text-xs">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
