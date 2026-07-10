/**
 * Erweiterungspunkt für zukünftige Benachrichtigungskanäle.
 *
 * Registrierung in NotificationRegistry bei vollständiger Implementierung.
 * Keine aktive Registrierung in Phase 7 – nur Architekturvorbereitung.
 */
export type FutureNotificationChannelId = 'push' | 'webhook';

export interface WebhookChannelConfig {
  enabled: boolean;
  url: string;
  secret?: string;
  events?: string[];
}

export interface TenantWebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
}

/**
 * Stub-Interface für tenantbezogene Webhooks.
 * Persistenz: geplante Tabelle `tenant_webhooks` (nicht in Phase 7).
 */
export interface TenantWebhookChannel {
  readonly id: 'webhook';
  readonly label: string;
  registerEndpoint(endpoint: TenantWebhookEndpoint): void;
}
