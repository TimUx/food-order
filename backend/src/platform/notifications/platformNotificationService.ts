/**
 * Plattform-Benachrichtigungen – System-E-Mails über zentralen MailService.
 */

import type { TenantApplication } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { mailService } from '../mail/MailService';

export interface TenantApprovedAdminInfo {
  userId: string;
  email: string;
  username: string | null;
  temporaryPassword: string;
  firstName: string;
  lastName: string;
  created: boolean;
}

export type PlatformNotificationEvent =
  | 'tenant.created'
  | 'tenant.application.submitted'
  | 'tenant.application.confirmed'
  | 'tenant.application.approved'
  | 'tenant.access_info.resent'
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

async function getAdminEmails(): Promise<string[]> {
  const users = await prisma.platformUser.findMany({
    where: { active: true },
    select: { email: true },
  });
  return users.map((u: { email: string }) => u.email);
}

async function sendEmail(payload: PlatformNotificationPayload): Promise<void> {
  const smtp = await mailService.loadConfig();
  if (!smtp) {
    logger.warn('Plattform-SMTP nicht konfiguriert – Benachrichtigung nur geloggt', {
      event: payload.event,
      title: payload.title,
    });
    return;
  }

  const recipients = payload.recipientEmail
    ? [payload.recipientEmail]
    : await getAdminEmails();

  for (const email of recipients) {
    const result = await mailService.send({
      to: email,
      subject: payload.title,
      text: payload.body,
      html: payload.html,
      template: payload.event,
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
      title: 'Vielen Dank für Ihren Mandantenantrag bei FestSchmiede',
      recipientEmail: application.email,
      body: [
        `Hallo ${application.contactName},`,
        '',
        'vielen Dank für Ihre Bewerbung als FestSchmiede-Mandant.',
        `Wir haben Ihren Antrag für „${application.organization}" erhalten`,
        `(Subdomain: ${application.requestedSubdomain}).`,
        '',
        'Unser Team prüft Ihre Angaben und meldet sich bei Ihnen.',
        '',
        'Mit freundlichen Grüßen',
        'Ihr FestSchmiede-Team',
      ].join('\n'),
      html: `<p>Hallo ${application.contactName},</p>
        <p>vielen Dank für Ihre Bewerbung als FestSchmiede-Mandant.</p>
        <p>Wir haben Ihren Antrag für <strong>${application.organization}</strong> erhalten
        (Subdomain: <strong>${application.requestedSubdomain}</strong>).</p>
        <p>Unser Team prüft Ihre Angaben und meldet sich bei Ihnen.</p>
        <p>Mit freundlichen Grüßen<br/>Ihr FestSchmiede-Team</p>`,
    });
  },

  async notifyTenantApproved(params: {
    organizationName: string;
    admin: TenantApprovedAdminInfo;
    adminUrl: string;
    publicUrl: string;
    tenantSlug: string;
    resent?: boolean;
  }): Promise<void> {
    const { admin, organizationName, adminUrl, publicUrl, tenantSlug, resent = false } = params;
    const loginHint = admin.username
      ? `Benutzername: ${admin.username}\nE-Mail: ${admin.email}`
      : `E-Mail: ${admin.email}`;
    const intro = resent
      ? [
          `anbei erhalten Sie erneut die Zugangsdaten für Ihren FestSchmiede-Mandanten „${organizationName}".`,
          'Falls Sie bereits angemeldet waren, wurde das Passwort zurückgesetzt.',
        ]
      : [
          `Ihr Mandantenantrag für „${organizationName}" wurde genehmigt.`,
          'Ihr Mandant wurde eingerichtet und ist jetzt aktiv.',
        ];

    await this.notify({
      event: resent ? 'tenant.access_info.resent' : 'tenant.application.approved',
      title: resent
        ? `Ihre FestSchmiede-Zugangsdaten – ${organizationName}`
        : `Ihr FestSchmiede-Mandant „${organizationName}" ist bereit`,
      recipientEmail: admin.email,
      body: [
        `Hallo ${admin.firstName},`,
        '',
        ...intro,
        '',
        'Zugangsdaten für die Administration:',
        loginHint,
        `Temporäres Passwort: ${admin.temporaryPassword}`,
        '',
        'Wichtige Links:',
        `Administration: ${adminUrl}`,
        `Öffentliche Bestellseite: ${publicUrl}`,
        `Mandanten-Pfad: /${tenantSlug}`,
        '',
        'Bitte melden Sie sich an und ändern Sie das Passwort unter „Mein Profil".',
        resent ? '' : 'Beim ersten Login führt ein Einrichtungsassistent Sie durch die Grundeinstellungen.',
        '',
        'Mit freundlichen Grüßen',
        'Ihr FestSchmiede-Team',
      ].filter(Boolean).join('\n'),
      html: `<p>Hallo ${admin.firstName},</p>
        <p>${intro.join(' ')}</p>
        <h3>Zugangsdaten für die Administration</h3>
        <ul>
          ${admin.username ? `<li><strong>Benutzername:</strong> ${admin.username}</li>` : ''}
          <li><strong>E-Mail:</strong> ${admin.email}</li>
          <li><strong>Temporäres Passwort:</strong> <code>${admin.temporaryPassword}</code></li>
        </ul>
        <h3>Wichtige Links</h3>
        <ul>
          <li><a href="${adminUrl}">Administration öffnen</a></li>
          <li><a href="${publicUrl}">Öffentliche Bestellseite</a></li>
          <li><strong>Mandanten-Pfad:</strong> /${tenantSlug}</li>
        </ul>
        <p>Bitte melden Sie sich an und ändern Sie das Passwort unter „Mein Profil".${
          resent ? '' : ' Beim ersten Login führt ein Einrichtungsassistent Sie durch die Grundeinstellungen.'
        }</p>
        <p>Mit freundlichen Grüßen<br/>Ihr FestSchmiede-Team</p>`,
    });
  },
};
