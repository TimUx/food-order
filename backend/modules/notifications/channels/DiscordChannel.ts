import type { NotificationConfig } from '../config';
import type { ChannelHealthResult, ChannelSendResult, NotificationChannel, NotificationMessage } from '../NotificationChannel';

export class DiscordChannel implements NotificationChannel {
  readonly id = 'discord' as const;
  readonly label = 'Discord';

  isConfigured(config: NotificationConfig): boolean {
    return Boolean(config.discord.enabled && String(config.discord.webhookUrl ?? '').trim());
  }

  async send(config: NotificationConfig, message: NotificationMessage): Promise<ChannelSendResult> {
    const webhookUrl = String(config.discord.webhookUrl ?? '').trim();
    if (!webhookUrl) return { ok: false, error: 'Discord-Webhook fehlt' };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message.body.slice(0, 2000),
          embeds: [{
            title: message.title.slice(0, 256),
            description: message.body.slice(0, 4096),
            color: 0x1976d2,
          }],
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `Discord HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Discord-Versand fehlgeschlagen' };
    }
  }

  async testConnection(config: NotificationConfig): Promise<ChannelHealthResult> {
    const result = await this.send(config, {
      title: 'FestManager Test',
      body: 'Discord-Webhook-Verbindungstest.',
    });
    return { ok: result.ok, message: result.ok ? 'Testnachricht gesendet' : result.error };
  }
}
