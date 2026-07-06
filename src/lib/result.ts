/**
 * Typed Result pattern for fallible downstream calls (code_standards.md §5).
 * Failures are values, never thrown, so callers are forced to handle them.
 */
export type Result<T, E = string> =
  { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = string>(error: E): Result<never, E> {
  return { ok: false, error };
}
