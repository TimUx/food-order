import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { decryptValue, isEncryptedValue } from '../../../src/platform/settings/SettingsEncryption';
import type { NotificationConfig } from '../config';
import type { ChannelHealthResult, ChannelSendResult, NotificationChannel, NotificationMessage } from '../NotificationChannel';
import { resolveSmtpTransportOptions } from '../../../src/platform/mail/smtpTransport';

function resolveSmtpPass(pass: unknown): string {
  if (typeof pass !== 'string') return '';
  if (!isEncryptedValue(pass)) return pass;
  try {
    return decryptValue(pass);
  } catch {
    return '';
  }
}

function createTransporter(smtp: NotificationConfig['smtp']): Transporter | null {
  const host = String(smtp.host ?? '').trim();
  if (!host) return null;
  const port = Number(smtp.port ?? 587);
  const user = String(smtp.user ?? '').trim();
  const pass = resolveSmtpPass(smtp.pass);
  const { secure, requireTLS } = resolveSmtpTransportOptions(port, {
    secure: Boolean(smtp.secure),
    useTls: smtp.useTls,
  });
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS,
    auth: user ? { user, pass } : undefined,
  });
}

function formatFrom(smtp: NotificationConfig['smtp']): string {
  const address = String(smtp.from ?? '').trim() || 'noreply@verein.local';
  const name = String(smtp.senderName ?? '').trim();
  return name ? `"${name.replace(/"/g, '\\"')}" <${address}>` : address;
}

export class SmtpChannel implements NotificationChannel {
  readonly id = 'email' as const;
  readonly label = 'E-Mail (SMTP)';

  isConfigured(config: NotificationConfig): boolean {
    const smtp = config.smtp;
    return Boolean(smtp?.enabled && String(smtp.host ?? '').trim());
  }

  async send(config: NotificationConfig, message: NotificationMessage): Promise<ChannelSendResult> {
    if (!message.recipientEmail) {
      return { ok: false, error: 'Keine Empfänger-E-Mail' };
    }
    const transporter = createTransporter(config.smtp);
    if (!transporter) {
      return { ok: false, error: 'SMTP nicht konfiguriert' };
    }
    const replyTo = String(config.smtp.replyTo ?? '').trim();
    try {
      await transporter.sendMail({
        from: formatFrom(config.smtp),
        to: message.recipientEmail,
        replyTo: replyTo || undefined,
        subject: message.title,
        text: message.body,
        html: message.html ?? message.body,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'SMTP-Versand fehlgeschlagen' };
    }
  }

  async testConnection(config: NotificationConfig): Promise<ChannelHealthResult> {
    const transporter = createTransporter(config.smtp);
    if (!transporter) {
      return { ok: false, message: 'SMTP-Host fehlt' };
    }
    try {
      await transporter.verify();
      const source = config.smtp.source === 'platform' ? ' (Plattform-SMTP)' : '';
      return { ok: true, message: `SMTP-Verbindung erfolgreich${source}` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Verbindung fehlgeschlagen' };
    }
  }
}
