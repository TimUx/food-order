import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defaultNotificationConfig, type NotificationConfig } from '../config';

vi.mock('../../../src/platform/mail/MailService', () => ({
  mailService: {
    loadConfig: vi.fn(),
  },
}));

import { mailService } from '../../../src/platform/mail/MailService';
import { loadPlatformSmtp, resolveSmtpConfig } from './smtpResolver';

describe('smtpResolver', () => {
  beforeEach(() => {
    vi.mocked(mailService.loadConfig).mockReset();
  });

  it('returns null when platform SMTP is not configured', async () => {
    vi.mocked(mailService.loadConfig).mockResolvedValue(null);
    expect(await loadPlatformSmtp()).toBeNull();
  });

  it('loads platform SMTP when configured', async () => {
    vi.mocked(mailService.loadConfig).mockResolvedValue({
      enabled: true,
      host: 'smtp.platform.test',
      port: 587,
      user: '',
      pass: '',
      from: 'noreply@platform.test',
      senderName: 'Platform',
      replyTo: '',
      secure: false,
      useTls: true,
      timeout: 30000,
    });

    const smtp = await loadPlatformSmtp();
    expect(smtp?.host).toBe('smtp.platform.test');
    expect(smtp?.source).toBe('platform');
  });

  it('uses platform SMTP exclusively with tenant branding overrides', async () => {
    vi.mocked(mailService.loadConfig).mockResolvedValue({
      enabled: true,
      host: 'smtp.platform.test',
      port: 587,
      user: '',
      pass: '',
      from: 'noreply@platform.test',
      senderName: 'Platform',
      replyTo: '',
      secure: false,
      useTls: true,
      timeout: 30000,
    });

    const tenantConfig = {
      ...defaultNotificationConfig,
      smtp: {
        enabled: true,
        from: 'custom@tenant.de',
        senderName: 'Tenant Name',
        source: 'platform' as const,
      },
    };

    const resolved = await resolveSmtpConfig(tenantConfig);
    expect(resolved.host).toBe('smtp.platform.test');
    expect(resolved.source).toBe('platform');
    expect(resolved.from).toBe('custom@tenant.de');
    expect(resolved.senderName).toBe('Tenant Name');
  });

  it('returns disabled smtp when platform is not configured', async () => {
    vi.mocked(mailService.loadConfig).mockResolvedValue(null);

    const resolved = await resolveSmtpConfig(defaultNotificationConfig);
    expect(resolved.enabled).toBe(false);
    expect(resolved.source).toBe('platform');
  });

  it('tolerates missing tenant smtp branding when platform SMTP exists', async () => {
    vi.mocked(mailService.loadConfig).mockResolvedValue({
      enabled: true,
      host: 'smtp.platform.test',
      port: 587,
      user: 'mailer',
      pass: 'secret',
      from: 'noreply@platform.test',
      senderName: 'Platform',
      replyTo: '',
      secure: false,
      useTls: true,
      timeout: 30000,
    });

    const resolved = await resolveSmtpConfig({
      ...defaultNotificationConfig,
      smtp: undefined as unknown as NotificationConfig['smtp'],
    });

    expect(resolved.host).toBe('smtp.platform.test');
    expect(resolved.from).toBe('noreply@platform.test');
    expect(resolved.source).toBe('platform');
  });
});
