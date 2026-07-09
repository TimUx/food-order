import type { NotificationConfig } from '../config';
import type { ChannelHealthResult, ChannelSendResult, NotificationChannel, NotificationMessage } from '../NotificationChannel';

export class TeamsChannel implements NotificationChannel {
  readonly id = 'teams' as const;
  readonly label = 'Microsoft Teams';

  isConfigured(config: NotificationConfig): boolean {
    return Boolean(config.teams.enabled && String(config.teams.webhookUrl ?? '').trim());
  }

  async send(config: NotificationConfig, message: NotificationMessage): Promise<ChannelSendResult> {
    const webhookUrl = String(config.teams.webhookUrl ?? '').trim();
    if (!webhookUrl) return { ok: false, error: 'Teams-Webhook fehlt' };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          themeColor: '1976D2',
          summary: message.title,
          sections: [{
            activityTitle: message.title,
            text: message.body,
          }],
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `Teams HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Teams-Versand fehlgeschlagen' };
    }
  }

  async testConnection(config: NotificationConfig): Promise<ChannelHealthResult> {
    const result = await this.send(config, {
      title: 'FestManager Test',
      body: 'Microsoft-Teams-Webhook-Verbindungstest.',
    });
    return { ok: result.ok, message: result.ok ? 'Testnachricht gesendet' : result.error };
  }
}
