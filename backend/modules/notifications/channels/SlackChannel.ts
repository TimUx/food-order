import type { NotificationConfig } from '../config';
import type { ChannelHealthResult, ChannelSendResult, NotificationChannel, NotificationMessage } from '../NotificationChannel';

export class SlackChannel implements NotificationChannel {
  readonly id = 'slack' as const;
  readonly label = 'Slack';

  isConfigured(config: NotificationConfig): boolean {
    return Boolean(config.slack.enabled && String(config.slack.webhookUrl ?? '').trim());
  }

  async send(config: NotificationConfig, message: NotificationMessage): Promise<ChannelSendResult> {
    const webhookUrl = String(config.slack.webhookUrl ?? '').trim();
    if (!webhookUrl) return { ok: false, error: 'Slack-Webhook fehlt' };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*${message.title}*\n${message.body}`,
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `Slack HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Slack-Versand fehlgeschlagen' };
    }
  }

  async testConnection(config: NotificationConfig): Promise<ChannelHealthResult> {
    const result = await this.send(config, {
      title: 'FestManager Test',
      body: 'Slack-Webhook-Verbindungstest.',
    });
    return { ok: result.ok, message: result.ok ? 'Testnachricht gesendet' : result.error };
  }
}
