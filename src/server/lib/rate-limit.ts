import "server-only";

/**
 * Basic abuse guard for the interactions endpoint (build_plan.md Phase 5;
 * "Everything must be free" rules out Redis/Upstash for this). A fixed-window
 * counter per key, held in process memory.
 *
 * Trade-off, documented rather than hidden (same spirit as the dashboard's
 * polling-interval note in AI_NOTES.md): Vercel serverless functions don't
 * share memory across instances, so this only throttles floods hitting the
 * same warm instance — it is a best-effort layer on top of, not a
 * replacement for, signature verification.
 */

type Window = { count: number; windowStart: number };

const windows = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
): boolean {
  const current = now();
  const existing = windows.get(key);

  if (!existing || current - existing.windowStart >= windowMs) {
    windows.set(key, { count: 1, windowStart: current });
    return true;
  }

  if (existing.count >= limit) return false;

  existing.count += 1;
  return true;
}

/** Test-only: clears all counters so tests don't leak state between cases. */
export function resetRateLimits(): void {
  windows.clear();
}
