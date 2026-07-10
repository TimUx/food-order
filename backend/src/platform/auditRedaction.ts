import type { AuditLogEntry } from './types';

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'secret',
  'refreshToken',
  'apiKey',
  'smtpPass',
]);

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key)) return '[REDACTED]';
  if (typeof value === 'string' && value.length > 64 && /[A-Za-z0-9+/=]{32,}/.test(value)) {
    return '[REDACTED]';
  }
  return value;
}

export function redactAuditDetails(details?: Record<string, unknown>): Record<string, unknown> {
  if (!details) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redactAuditDetails(value as Record<string, unknown>);
    } else {
      out[key] = redactValue(key, value);
    }
  }
  return out;
}

export function safeAuditLogLine(entry: AuditLogEntry): Record<string, unknown> {
  return {
    action: entry.action,
    actorId: entry.actorId,
    moduleId: entry.moduleId,
    details: redactAuditDetails(entry.details as Record<string, unknown> | undefined),
  };
}
