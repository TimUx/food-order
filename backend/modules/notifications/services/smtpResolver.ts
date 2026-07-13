import { mailService } from '../../../src/platform/mail/MailService';
import type { NotificationConfig } from '../config';

export type PlatformSmtpConfig = NotificationConfig['smtp'];

/**
 * Lädt die zentrale Plattform-SMTP-Konfiguration.
 * Mandanten besitzen keine eigene SMTP-Konfiguration mehr.
 */
export async function loadPlatformSmtp(): Promise<PlatformSmtpConfig | null> {
  const config = await mailService.loadConfig();
  if (!config) return null;

  return {
    enabled: true,
    host: config.host,
    port: config.port,
    user: config.user,
    pass: config.pass,
    from: config.from,
    senderName: config.senderName,
    replyTo: config.replyTo,
    secure: config.secure,
    useTls: config.useTls,
    source: 'platform' as const,
  };
}

/**
 * Alle E-Mails nutzen ausschließlich den zentralen Plattform-SMTP.
 * Mandanten können nur Branding-Felder (Absendername, Reply-To) überschreiben.
 */
export async function resolveSmtpConfig(
  tenantConfig: NotificationConfig
): Promise<NotificationConfig['smtp']> {
  const platformSmtp = await loadPlatformSmtp();
  const tenantBranding = tenantConfig.smtp ?? {};

  if (platformSmtp) {
    return {
      ...platformSmtp,
      from: String(tenantBranding.from ?? '').trim() || platformSmtp.from,
      senderName: String(tenantBranding.senderName ?? '').trim() || platformSmtp.senderName,
      replyTo: String(tenantBranding.replyTo ?? '').trim() || platformSmtp.replyTo,
      source: 'platform',
    };
  }

  return { ...tenantBranding, enabled: false, source: 'platform' };
}
