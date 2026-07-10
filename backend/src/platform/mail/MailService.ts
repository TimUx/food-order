import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { decryptValue, encryptValue, isEncryptedValue } from '../settings/SettingsEncryption';
import { logger } from '../../utils/logger';
import type { MailMessage, MailQueueStatus, MailSendResult, PlatformSmtpConfig } from './types';
import { renderMailTemplate, type TemplateContext } from './templates';
import type { MailTemplateId } from './types';

const SMTP_PREFIX = 'platform.smtp.';
const ENCRYPTED_KEYS = new Set(['platform.smtp.pass']);

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

function formatFrom(smtp: PlatformSmtpConfig): string {
  const address = smtp.from || `noreply@${config.multiTenant.baseDomain}`;
  return smtp.senderName ? `"${smtp.senderName.replace(/"/g, '\\"')}" <${address}>` : address;
}

function createTransporter(smtp: PlatformSmtpConfig): Transporter | null {
  if (!smtp.host) return null;
  const secure = smtp.secure || smtp.port === 465;
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure,
    requireTLS: !secure && smtp.useTls,
    connectionTimeout: smtp.timeout,
    greetingTimeout: smtp.timeout,
    socketTimeout: smtp.timeout,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
}

export class MailService {
  async loadConfig(): Promise<PlatformSmtpConfig | null> {
    const rows = await prisma.platformSettings.findMany({
      where: { key: { startsWith: SMTP_PREFIX } },
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
      timeout: readNumber(map.get('platform.smtp.timeout'), 30000),
    };
  }

  async getConfigForAdmin(): Promise<Record<string, unknown>> {
    const rows = await prisma.platformSettings.findMany({
      where: { key: { startsWith: SMTP_PREFIX } },
    });
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      const shortKey = row.key.slice(SMTP_PREFIX.length);
      if (shortKey === 'pass') {
        result.passConfigured = Boolean(row.value && readString(row.value));
        continue;
      }
      result[shortKey] = row.value;
    }
    return result;
  }

  async updateConfig(
    updates: Record<string, unknown>,
    updatedBy?: string
  ): Promise<Record<string, unknown>> {
    for (const [shortKey, value] of Object.entries(updates)) {
      if (shortKey === 'passConfigured') continue;
      const key = `${SMTP_PREFIX}${shortKey}`;
      let stored: unknown = value;
      if (shortKey === 'pass') {
        const pass = readString(value);
        if (!pass) continue;
        stored = encryptValue(pass);
      }
      await prisma.platformSettings.upsert({
        where: { key },
        update: { value: stored as object, encrypted: ENCRYPTED_KEYS.has(key), updatedBy: updatedBy ?? null },
        create: { key, value: stored as object, encrypted: ENCRYPTED_KEYS.has(key), updatedBy: updatedBy ?? null },
      });
    }
    return this.getConfigForAdmin();
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    const smtp = await this.loadConfig();
    if (!smtp) {
      return { ok: false, error: 'Plattform-SMTP nicht konfiguriert' };
    }

    const transporter = createTransporter(smtp);
    if (!transporter) {
      return { ok: false, error: 'SMTP-Transport konnte nicht erstellt werden' };
    }

    try {
      await transporter.sendMail({
        from: formatFrom(smtp),
        to: message.to,
        replyTo: message.replyTo || smtp.replyTo || undefined,
        subject: message.subject,
        text: message.text,
        html: message.html ?? message.text,
      });

      await this.recordDelivery(message.tenantId ?? 'platform', 'sent', message.to, message.template);
      return { ok: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SMTP-Versand fehlgeschlagen';
      await this.recordDelivery(message.tenantId ?? 'platform', 'failed', message.to, message.template, error);
      logger.error('MailService Versand fehlgeschlagen', { to: message.to, error });
      return { ok: false, error };
    }
  }

  async sendTemplate(
    templateId: MailTemplateId,
    to: string,
    context: TemplateContext,
    tenantId?: string
  ): Promise<MailSendResult> {
    const rendered = renderMailTemplate(templateId, context);
    return this.send({
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      tenantId,
      template: templateId,
    });
  }

  async sendTestMail(recipient: string, updatedBy?: string): Promise<MailSendResult> {
    void updatedBy;
    return this.sendTemplate('test-mail', recipient, {});
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const smtp = await this.loadConfig();
    if (!smtp) {
      return { ok: false, message: 'SMTP nicht konfiguriert oder deaktiviert' };
    }
    const transporter = createTransporter(smtp);
    if (!transporter) {
      return { ok: false, message: 'SMTP-Host fehlt' };
    }
    try {
      await transporter.verify();
      return { ok: true, message: `SMTP-Verbindung zu ${smtp.host}:${smtp.port} erfolgreich` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Verbindung fehlgeschlagen' };
    }
  }

  async getQueueStatus(): Promise<MailQueueStatus> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<Array<{ status: string; count: bigint; last_at: Date | null }>>`
      SELECT status, COUNT(*)::bigint AS count, MAX(created_at) AS last_at
      FROM notification_deliveries
      WHERE channel_id = 'email' AND created_at >= ${since}
      GROUP BY status
    `.catch(() => [] as Array<{ status: string; count: bigint; last_at: Date | null }>);

    let pending = 0;
    let sent = 0;
    let failed = 0;
    let lastSentAt: string | null = null;

    for (const row of rows) {
      const count = Number(row.count);
      if (row.status === 'pending') pending = count;
      else if (row.status === 'sent' || row.status === 'ok') {
        sent += count;
        if (row.last_at) lastSentAt = row.last_at.toISOString();
      } else if (row.status === 'failed' || row.status === 'error') {
        failed += count;
      }
    }

    return { pending, sent, failed, total: pending + sent + failed, lastSentAt };
  }

  private async recordDelivery(
    tenantId: string,
    status: string,
    recipient: string,
    template?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO notification_deliveries (id, tenant_id, event_type, channel_id, recipient, status, error_message, smtp_source, created_at)
        VALUES (
          gen_random_uuid(),
          ${tenantId},
          ${template ?? 'mail'},
          'email',
          ${recipient},
          ${status},
          ${errorMessage ?? null},
          'platform',
          NOW()
        )
      `;
    } catch {
      // Tabelle optional – kein harter Fehler
    }
  }
}

export const mailService = new MailService();
