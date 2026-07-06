"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/cn";

export type SecretInputProps = {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
};

/**
 * Masked secret field with a reveal toggle (ui_rules.md §3, ui_registry.md).
 * Never pre-filled with the real secret from the server — callers pass a
 * `placeholder` like "•••• (unchanged)" instead of `defaultValue` when a
 * secret already exists, so the current value never round-trips to the client.
 */
export function SecretInput({
  label,
  name,
  defaultValue,
  placeholder,
  error,
}: SecretInputProps) {
  const [revealed, setRevealed] = useState(false);
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-foreground text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={revealed ? "text" : "password"}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={!!error}
          className={cn(
            "bg-input h-9 w-full rounded-[var(--radius-sm)] border px-3 pr-16 font-mono text-sm",
            "placeholder:text-muted-foreground placeholder:font-sans",
            "focus-visible:ring-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:outline-none",
            error ? "border-danger" : "border-border",
          )}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 text-xs font-medium"
        >
          {revealed ? "Hide" : "Show"}
        </button>
      </div>
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
