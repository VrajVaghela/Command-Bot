import "server-only";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { retryFailedActions } from "@/server/mirror/retry-failed-actions";

/**
 * Manual/cron recovery worker (architecture.md §3 folder-structure note) for
 * `actions` rows that exhausted their inline retries inside `after()`.
 * Auth-gated (build_plan.md Phase 5 hardening) — this used to be open before
 * Phase 4 shipped admin auth; now that it has, an unauthenticated caller
 * shouldn't be able to trigger downstream sends, even bounded ones.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await retryFailedActions();
  return NextResponse.json({ retried: results.length, results });
}
