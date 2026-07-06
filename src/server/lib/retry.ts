import "server-only";
import { type Result, err } from "@/lib/result";

/**
 * Bounded exponential backoff for downstream calls (code_standards.md §5).
 * Never throws — the last attempt's Result (success or failure) is returned,
 * and `onAttempt` is invoked after every try so callers can persist progress
 * (e.g. an `actions` row's `attempts`/`detail`) even if the caller ultimately
 * gives up.
 */
export const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  attempt: () => Promise<Result<T>>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    onAttempt?: (attemptNumber: number, result: Result<T>) => Promise<void>;
  } = {},
): Promise<Result<T>> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? BASE_DELAY_MS;

  let last: Result<T> = err("attempt never ran");
  for (let attemptNumber = 1; attemptNumber <= maxRetries; attemptNumber++) {
    try {
      last = await attempt();
    } catch (error) {
      last = err(error instanceof Error ? error.message : "unknown error");
    }

    if (options.onAttempt) {
      await options.onAttempt(attemptNumber, last);
    }

    if (last.ok) return last;
    if (attemptNumber < maxRetries) {
      await sleep(baseDelayMs * 3 ** (attemptNumber - 1));
    }
  }
  return last;
}
