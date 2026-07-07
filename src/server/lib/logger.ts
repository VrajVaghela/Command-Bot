import "server-only";

/**
 * Structured logging with secret redaction (code_standards.md §6 "Add a log
 * redactor for known secret patterns"; architecture.md "secrets... never in
 * logs"). Emits one JSON line per call so a hosting provider's log viewer can
 * filter/search by field, rather than free-text `console.error(err)`.
 */

const SECRET_KEY_PATTERN =
  /token|secret|password|passwd|webhook|authorization|api[-_]?key|database[-_]?url/i;

const SECRET_VALUE_PATTERNS = [
  // Discord/Slack webhook URLs — the path segment itself is the credential.
  /(?:https?:\/\/)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/\S+/i,
  /(?:https?:\/\/)?hooks\.slack\.com\/services\/\S+/i,
  // Postgres/Neon connection strings.
  /postgres(?:ql)?:\/\/\S+/i,
  // `Bearer <token>` / `Bot <token>` style authorization values.
  /\b(?:bearer|bot)\s+[\w-]{16,}/i,
];

const REDACTED = "[REDACTED]";

function redactString(value: string): string {
  let redacted = value;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    redacted = redacted.replace(pattern, REDACTED);
  }
  return redacted;
}

/** Recursively redacts secret-shaped keys/values from a log context object. */
export function redact(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redact(val);
    }
    return result;
  }
  return value;
}

export type LogContext = Record<string, unknown>;

type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, event: string, context?: LogContext): void {
  const record = {
    level,
    event,
    ts: new Date().toISOString(),
    ...(context ? (redact(context) as LogContext) : {}),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logInfo = (event: string, context?: LogContext): void =>
  write("info", event, context);
export const logWarn = (event: string, context?: LogContext): void =>
  write("warn", event, context);
export const logError = (event: string, context?: LogContext): void =>
  write("error", event, context);
