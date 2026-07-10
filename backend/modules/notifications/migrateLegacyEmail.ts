import { settingsService } from '../../src/platform/bootstrap';
import { CORE_EMAIL_NAMESPACE } from '../../src/platform/settings/SettingsNamespaces';
import type { FeatureContext } from '../../src/module-system/types';
import { defaultNotificationConfig, type NotificationConfig } from './config';

/** Migriert legacy `core.email` SMTP-Einstellungen in das Notifications-Modul. */
export async function migrateLegacyEmailSettings(context: FeatureContext): Promise<void> {
  const current = await context.getConfig<NotificationConfig>('notifications');
  const hasSmtp = Boolean(String(current?.smtp?.host ?? '').trim());
  if (hasSmtp) return;

  const legacy = await settingsService.getDecryptedValues(CORE_EMAIL_NAMESPACE);
  const legacyHost = String(legacy.smtpHost ?? '').trim();
  if (!legacyHost) return;

  const migrated: NotificationConfig = {
    ...defaultNotificationConfig,
    ...current,
    smtp: {
      enabled: true,
      host: legacyHost,
      port: Number(legacy.smtpPort ?? 587),
      user: String(legacy.smtpUser ?? ''),
      pass: typeof legacy.smtpPass === 'string' ? legacy.smtpPass : '',
      from: String(legacy.smtpFrom ?? 'noreply@verein.local'),
      secure: Number(legacy.smtpPort ?? 587) === 465,
      useTls: true,
      source: 'tenant',
    },
    emailCustomText: String(legacy.emailCustomText ?? current?.emailCustomText ?? ''),
  };

  await context.setConfig('notifications', migrated);
}
