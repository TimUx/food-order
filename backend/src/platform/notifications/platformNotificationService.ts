/**
 * Plattform-Benachrichtigungen – System-E-Mails über Plattform-SMTP.
 */

import type { TenantApplication } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { loadPlatformSmtp } from '../../../modules/notifications/services/smtpResolver';
import { SmtpChannel } from '../../../modules/notifications/channels/SmtpChannel';
import type { NotificationConfig } from '../../../modules/notifications/config';

export type PlatformNotificationEvent =
  | 'tenant.created'
  | 'tenant.application.submitted'
  | 'tenant.application.confirmed'
  | 'smtp.misconfigured'
  | 'backup.failed'
  | 'health.warning';

export interface PlatformNotificationPayload {
  event: PlatformNotificationEvent;
  title: string;
  body: string;
  html?: string;
  recipientEmail?: string;
  metadata?: Record<string, unknown>;
}

const smtpChannel = new SmtpChannel();

async function getAdminEmails(): Promise<string[]> {
  const users = await prisma.platformUser.findMany({
    where: { active: true },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

async function sendEmail(payload: PlatformNotificationPayload): Promise<void> {
  const smtp = await loadPlatformSmtp();
  if (!smtp?.host) {
    logger.warn('Plattform-SMTP nicht konfiguriert – Benachrichtigung nur geloggt', {
      event: payload.event,
      title: payload.title,
    });
    return;
  }

  const config: NotificationConfig = {
    smtp: { ...smtp, enabled: true, source: 'platform' },
    channels: { email: true },
  } as NotificationConfig;

  const recipients = payload.recipientEmail
    ? [payload.recipientEmail]
    : await getAdminEmails();

  for (const email of recipients) {
    const result = await smtpChannel.send(config, {
      title: payload.title,
      body: payload.body,
      html: payload.html,
      recipientEmail: email,
    });
    if (!result.ok) {
      logger.error('Plattform-E-Mail fehlgeschlagen', { event: payload.event, email, error: result.error });
    }
  }
}

export const platformNotificationService = {
  async notify(payload: PlatformNotificationPayload): Promise<void> {
    logger.info('Plattform-Benachrichtigung', { event: payload.event, title: payload.title });
    await sendEmail(payload);
  },

  async notifyApplicationSubmitted(application: TenantApplication): Promise<void> {
    await this.notify({
      event: 'tenant.application.submitted',
      title: `Neuer Mandantenantrag: ${application.organization}`,
      body: [
        `Organisation: ${application.organization}`,
        `Typ: ${application.organizationType}`,
        `Ansprechpartner: ${application.contactName}`,
        `E-Mail: ${application.email}`,
        `Subdomain: ${application.requestedSubdomain}`,
        '',
        application.reason,
      ].join('\n'),
      html: `<p>Ein neuer Mandantenantrag ist eingegangen.</p>
        <ul>
          <li><strong>Organisation:</strong> ${application.organization}</li>
          <li><strong>Typ:</strong> ${application.organizationType}</li>
          <li><strong>Ansprechpartner:</strong> ${application.contactName}</li>
          <li><strong>E-Mail:</strong> ${application.email}</li>
          <li><strong>Subdomain:</strong> ${application.requestedSubdomain}</li>
        </ul>
        <p>${application.reason}</p>`,
    });
  },

  async notifyApplicantConfirmation(application: TenantApplication): Promise<void> {
    await this.notify({
      event: 'tenant.application.confirmed',
      title: 'Vielen Dank für Ihren Mandantenantrag bei FestManager',
      recipientEmail: application.email,
      body: [
        `Hallo ${application.contactName},`,
        '',
        'vielen Dank für Ihre Bewerbung als FestManager-Mandant.',
        `Wir haben Ihren Antrag für „${application.organization}" erhalten`,
        `(Subdomain: ${application.requestedSubdomain}).`,
        '',
        'Unser Team prüft Ihre Angaben und meldet sich bei Ihnen.',
        '',
        'Mit freundlichen Grüßen',
        'Ihr FestManager-Team',
      ].join('\n'),
      html: `<p>Hallo ${application.contactName},</p>
        <p>vielen Dank für Ihre Bewerbung als FestManager-Mandant.</p>
        <p>Wir haben Ihren Antrag für <strong>${application.organization}</strong> erhalten
        (Subdomain: <strong>${application.requestedSubdomain}</strong>).</p>
        <p>Unser Team prüft Ihre Angaben und meldet sich bei Ihnen.</p>
        <p>Mit freundlichen Grüßen<br/>Ihr FestManager-Team</p>`,
    });
  },
};
