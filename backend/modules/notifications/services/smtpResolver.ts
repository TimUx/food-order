import { prisma } from '../../../src/config/database';
import { config } from '../../../src/config';
import { decryptValue, isEncryptedValue } from '../../../src/platform/settings/SettingsEncryption';
import type { NotificationConfig } from '../config';

export type PlatformSmtpConfig = NotificationConfig['smtp'];

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function resolvePass(pass: unknown): string {
  if (typeof pass !== 'string') return '';
  return isEncryptedValue(pass) ? decryptValue(pass) : pass;
}

export async function loadPlatformSmtp(): Promise<PlatformSmtpConfig | null> {
  const rows = await prisma.platformSettings.findMany({
    where: { key: { startsWith: 'platform.smtp.' } },
  });

  if (rows.length === 0) return null;

  const map = new Map(rows.map((r) => [r.key, r.value]));
  const enabled = readBool(map.get('platform.smtp.enabled'));
  if (!enabled) return null;

  const host = readString(map.get('platform.smtp.host'));
  if (!host) return null;

  return {
    enabled: true,
    host,
    port: readNumber(map.get('platform.smtp.port'), 587),
    user: readString(map.get('platform.smtp.user')),
    pass: resolvePass(map.get('platform.smtp.pass')),
    from: readString(map.get('platform.smtp.from')) || `noreply@${config.multiTenant.baseDomain}`,
    senderName: readString(map.get('platform.smtp.senderName')),
    replyTo: readString(map.get('platform.smtp.replyTo')),
    secure: readBool(map.get('platform.smtp.secure')),
    useTls: readBool(map.get('platform.smtp.useTls'), true),
    source: 'platform' as const,
  };
}

/**
 * Mandant-SMTP hat Priorität; Plattform-SMTP als Fallback.
 */
export async function resolveSmtpConfig(
  tenantConfig: NotificationConfig
): Promise<NotificationConfig['smtp']> {
  const tenantSmtp = tenantConfig.smtp;
  const useTenant =
    tenantSmtp.source !== 'platform' &&
    tenantSmtp.enabled &&
    Boolean(String(tenantSmtp.host ?? '').trim());

  if (useTenant) {
    return { ...tenantSmtp, source: 'tenant' };
  }

  const platformSmtp = await loadPlatformSmtp();
  if (platformSmtp) {
    return {
      ...platformSmtp,
      from: String(tenantSmtp.from ?? '').trim() || platformSmtp.from,
      senderName: String(tenantSmtp.senderName ?? '').trim() || platformSmtp.senderName,
      replyTo: String(tenantSmtp.replyTo ?? '').trim() || platformSmtp.replyTo,
      source: 'platform',
    };
  }

  return tenantSmtp;
}
