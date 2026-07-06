import { type InputHTMLAttributes, forwardRef, useId } from "react";

import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  mono?: boolean;
};

/** Text input with label + inline error (ui_rules.md §3). */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, mono, className, id, ...props }, ref) => {
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
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            "bg-input h-9 rounded-[var(--radius-sm)] border px-3 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:ring-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:outline-none",
            error ? "border-danger" : "border-border",
            mono && "font-mono",
            className,
          )}
          {...props}
        />
        {error && <p className="text-danger text-xs">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
