/**
 * Plattform-Benachrichtigungen (Phase 7 – Erweiterungspunkt).
 *
 * Systembenachrichtigungen sind vollständig von Mandanten-Benachrichtigungen getrennt.
 * Beispiele: neuer Mandant, fehlerhafte SMTP-Konfiguration, Backupfehler, Health-Warnungen.
 *
 * Versand erfolgt über Plattform-SMTP (`platform.smtp.*`) – nicht über TenantContext.
 * Implementierung: zukünftige Phase; aktuell nur Logging + Interface.
 */

import { logger } from '../../utils/logger';
import { loadPlatformSmtp } from '../../../modules/notifications/services/smtpResolver';

export type PlatformNotificationEvent =
  | 'tenant.created'
  | 'smtp.misconfigured'
  | 'backup.failed'
  | 'health.warning';

export interface PlatformNotificationPayload {
  event: PlatformNotificationEvent;
  title: string;
  body: string;
  recipientEmail?: string;
  metadata?: Record<string, unknown>;
}

export const platformNotificationService = {
  /**
   * Sendet eine Systembenachrichtigung an Plattformadministratoren.
   * Aktuell: Logging; vollständiger Versand folgt in späterer Phase.
   */
  async notify(payload: PlatformNotificationPayload): Promise<void> {
    const smtp = await loadPlatformSmtp();
    logger.info('Plattform-Benachrichtigung', {
      event: payload.event,
      smtpAvailable: Boolean(smtp?.host),
      title: payload.title,
    });
  },
};
