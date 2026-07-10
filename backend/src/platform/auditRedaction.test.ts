import { describe, it, expect } from 'vitest';
import { redactAuditDetails, safeAuditLogLine } from './auditRedaction';

describe('auditRedaction', () => {
  it('redacts sensitive keys', () => {
    const redacted = redactAuditDetails({
      email: 'user@example.de',
      password: 'secret123',
      token: 'abc',
      nested: { smtpPass: 'x', name: 'Test' },
    });

    expect(redacted.email).toBe('user@example.de');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).smtpPass).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).name).toBe('Test');
  });

  it('produces safe audit log lines', () => {
    const line = safeAuditLogLine({
      action: 'user.login',
      actorId: 'actor-1',
      details: { refreshToken: 'long-token-value' },
    });

    expect(line.action).toBe('user.login');
    expect((line.details as Record<string, unknown>).refreshToken).toBe('[REDACTED]');
  });
});
