"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { retryFailedActionsAction } from "@/server/actions/mirror";

/** Manually re-runs failed downstream actions (ui_registry.md, build_plan.md Phase 5). */
export function RetryFailedActionsButton() {
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | undefined>();

  const handleRetry = () => {
    setSummary(undefined);
    startTransition(async () => {
      const results = await retryFailedActionsAction();
      const succeeded = results.filter((r) => r.ok).length;
      setSummary(
        results.length === 0
          ? "Nothing to retry."
          : `Retried ${results.length}, ${succeeded} succeeded.`,
      );
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={handleRetry}
      >
        Retry failed actions
      </Button>
      {summary && (
        <span className="text-muted-foreground text-xs">{summary}</span>
      )}
    </div>
  );
}
