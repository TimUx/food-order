import { settingsService } from '../../src/platform/bootstrap';
import { CORE_EMAIL_NAMESPACE } from '../../src/platform/settings/SettingsNamespaces';
import type { FeatureContext } from '../../src/platform/module-api';
import { defaultNotificationConfig, mergeNotificationConfig, type NotificationConfig } from './config';

/** Migriert legacy `core.email` Texte — SMTP liegt seit v2.1 zentral in der Plattform. */
export async function migrateLegacyEmailSettings(context: FeatureContext): Promise<void> {
  const current = await context.getConfig<Partial<NotificationConfig>>('notifications');
  const legacy = await settingsService.getDecryptedValues(CORE_EMAIL_NAMESPACE);
  const legacyText = String(legacy.emailCustomText ?? '').trim();
  if (!legacyText) return;

  const migrated = mergeNotificationConfig({
    ...current,
    emailCustomText: legacyText,
  });

  await context.setConfig('notifications', migrated);
}
