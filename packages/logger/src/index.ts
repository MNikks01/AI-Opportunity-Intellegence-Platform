/**
 * @aioi/logger
 * Structured JSON logging (pino). Never log secrets or PII (see CODE_GUIDELINES §3).
 */
import pino, { type Logger } from "pino";

export type { Logger };

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger: Logger = pino({
  level,
  redact: {
    paths: ["*.password", "*.token", "*.apiKey", "*.secret", "req.headers.authorization"],
    censor: "[redacted]",
  },
});

/** Child logger bound to a request/trace + org for correlation. */
export function withContext(ctx: { traceId?: string; orgId?: string; service?: string }): Logger {
  return logger.child(ctx);
}
