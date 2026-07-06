import { type SelectHTMLAttributes, forwardRef, useId } from "react";

import { cn } from "@/lib/cn";

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
};

/** Native select — full keyboard nav for free (ui_rules.md §3). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
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
        <select
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            "bg-input h-9 rounded-[var(--radius-sm)] border px-3 text-sm",
            "focus-visible:ring-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:outline-none",
            error ? "border-danger" : "border-border",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-danger text-xs">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
