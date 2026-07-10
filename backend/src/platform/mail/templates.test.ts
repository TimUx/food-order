import { describe, it, expect } from 'vitest';
import { renderMailTemplate } from './templates';

describe('mail templates', () => {
  it('renders login-code template', () => {
    const result = renderMailTemplate('login-code', { code: '123456', expiresMinutes: 10 });
    expect(result.subject).toContain('Anmeldecode');
    expect(result.text).toContain('123456');
    expect(result.html).toContain('123456');
  });

  it('renders magic-link template', () => {
    const result = renderMailTemplate('magic-link', {
      magicLink: 'https://example.test/login?token=abc',
      expiresMinutes: 15,
    });
    expect(result.subject).toContain('Anmeldelink');
    expect(result.html).toContain('https://example.test/login?token=abc');
  });

  it('renders test-mail template', () => {
    const result = renderMailTemplate('test-mail', {});
    expect(result.subject).toContain('Testmail');
    expect(result.text).toContain('SMTP-Konfiguration');
  });

  it('renders initial-setup template', () => {
    const result = renderMailTemplate('initial-setup', { tenantName: 'SV Test' });
    expect(result.subject).toContain('Willkommen');
    expect(result.text).toContain('SV Test');
  });
});
