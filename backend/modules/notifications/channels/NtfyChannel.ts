import type { NotificationConfig } from '../config';
import type { ChannelHealthResult, ChannelSendResult, NotificationChannel, NotificationMessage } from '../NotificationChannel';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export class NtfyChannel implements NotificationChannel {
  readonly id = 'ntfy' as const;
  readonly label = 'ntfy';

  isConfigured(config: NotificationConfig): boolean {
    return Boolean(
      config.ntfy.enabled &&
      String(config.ntfy.serverUrl ?? '').trim() &&
      String(config.ntfy.topic ?? '').trim()
    );
  }

  async send(config: NotificationConfig, message: NotificationMessage): Promise<ChannelSendResult> {
    const base = normalizeBaseUrl(String(config.ntfy.serverUrl ?? 'https://ntfy.sh'));
    const topic = String(config.ntfy.topic ?? '').trim();
    if (!topic) return { ok: false, error: 'ntfy-Topic fehlt' };

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      Title: message.title,
    };
    if (message.priority === 'high') headers.Priority = 'high';
    const token = String(config.ntfy.token ?? '').trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(`${base}/${encodeURIComponent(topic)}`, {
        method: 'POST',
        headers,
        body: message.body,
      });
      if (!res.ok) {
        return { ok: false, error: `ntfy HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'ntfy-Versand fehlgeschlagen' };
    }
  }

  async testConnection(config: NotificationConfig): Promise<ChannelHealthResult> {
    const result = await this.send(config, {
      title: 'Testnachricht – FestManager',
      body: 'Die Benachrichtigungseinstellungen funktionieren.',
      priority: 'low',
    });
    return { ok: result.ok, message: result.ok ? 'Testnachricht gesendet' : result.error };
  }
}
