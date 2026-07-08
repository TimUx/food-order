import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config';
import { clubRepository } from '../repositories/clubRepository';
import { logger } from '../utils/logger';
import { formatPrice } from '../utils/helpers';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getSmtpConfig() {
  const settings = await clubRepository.get();
  return {
    host: settings.smtpHost?.trim() || '',
    port: settings.smtpPort || 587,
    user: settings.smtpUser?.trim() || '',
    pass: settings.smtpPass || '',
    from: settings.smtpFrom?.trim() || 'noreply@verein.local',
  };
}

function formatCustomEmailBlock(text?: string | null): string {
  const trimmed = text?.trim();
  if (!trimmed) return '';
  const html = escapeHtml(trimmed).replace(/\r?\n/g, '<br>');
  return `<div style="margin: 16px 0; padding: 12px 16px; background: #f5f5f5; border-radius: 4px; line-height: 1.5;">${html}</div>`;
}

async function getEmailCustomText(): Promise<string> {
  const settings = await clubRepository.get();
  return settings.emailCustomText?.trim() || '';
}

function createTransporter(smtp: Awaited<ReturnType<typeof getSmtpConfig>>): Transporter | null {
  if (!smtp.host) return null;
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
}

export const emailService = {
  async getSmtpConfig,

  async sendOrderConfirmation(
    email: string,
    order: {
      id: string;
      displayNumber: string;
      totalPrice: number;
      eventDateLabel?: string;
      items: { name: string; quantity: number; lineTotal: number }[];
      cancellationDeadlineLabel?: string;
    },
    club: {
      clubName: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    }
  ) {
    const smtp = await getSmtpConfig();
    const transporter = createTransporter(smtp);
    if (!transporter) {
      logger.info('SMTP nicht konfiguriert – E-Mail wird übersprungen');
      return;
    }

    const statusUrl = `${config.corsOrigin.replace(/\/$/, '')}/status/${order.id}`;
    const itemsList = order.items
      .map((i) => `${i.quantity}× ${i.name} – ${formatPrice(i.lineTotal)}`)
      .join('<br>');

    const contactLines = [
      club.contactName && `Ansprechpartner: ${escapeHtml(club.contactName)}`,
      club.email && `E-Mail: ${escapeHtml(club.email)}`,
      club.phone && `Telefon: ${escapeHtml(club.phone)}`,
      club.address && `Adresse: ${escapeHtml(club.address)}`,
    ].filter(Boolean);

    const cancellationNote = order.cancellationDeadlineLabel
      ? `<p>Stornierungen sind bis <strong>${escapeHtml(order.cancellationDeadlineLabel)}</strong> möglich.</p>`
      : '';

    const customBlock = formatCustomEmailBlock(await getEmailCustomText());

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
        <h2>Bestellbestätigung</h2>
        ${customBlock}
        <p>Vielen Dank für Ihre Bestellung bei <strong>${escapeHtml(club.clubName)}</strong>!</p>
        <p><strong>Ihre Abholnummer: ${escapeHtml(order.displayNumber)}</strong></p>
        ${order.eventDateLabel ? `<p><strong>Veranstaltungstag:</strong> ${escapeHtml(order.eventDateLabel)}</p>` : ''}
        <p>Bitte merken Sie sich diese Nummer oder zeigen Sie sie am Veranstaltungstag an der Kasse vor.</p>

        <h3>Verkäufer / Verein</h3>
        <p><strong>${escapeHtml(club.clubName)}</strong></p>
        ${contactLines.length ? `<p>${contactLines.join('<br>')}</p>` : ''}

        <h3>Ihre Bestellung</h3>
        <p>${itemsList}</p>
        <p><strong>Gesamt: ${formatPrice(order.totalPrice)}</strong></p>

        <h3>Rechtliche Hinweise</h3>
        <p style="font-size: 0.9em; line-height: 1.5;">
          Mit Absenden Ihrer Bestellung kommt ein verbindlicher Kaufvertrag zwischen Ihnen und
          ${escapeHtml(club.clubName)} zustande. Die bestellten Speisen werden am Veranstaltungstag
          zur Abholung bereitgestellt. Nicht abgeholte Bestellungen werden gleichwohl in Rechnung
          gestellt, sofern die Bestellung nicht fristgerecht storniert wurde.
          ${order.cancellationDeadlineLabel
            ? ` Die Stornierungsfrist endet am ${escapeHtml(order.cancellationDeadlineLabel)}.`
            : ''}
          Eine Stornierung nach Ablauf der Frist oder nach Bereitstellung der Bestellung ist nicht möglich.
        </p>
        ${cancellationNote}

        <p style="margin-top: 24px;">
          <a href="${statusUrl}" style="display: inline-block; padding: 12px 24px; background: #1976d2; color: #fff; text-decoration: none; border-radius: 4px;">
            Bestellstatus anzeigen / stornieren
          </a>
        </p>
        <p style="font-size: 0.85em; color: #666;">
          Direktlink: <a href="${statusUrl}">${statusUrl}</a>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: `Bestellbestätigung – Abholnummer ${order.displayNumber}`,
      html,
    });

    logger.info(`Bestellbestätigung gesendet an ${email}`);
  },

  async sendOrderCancellation(
    email: string,
    order: {
      id: string;
      displayNumber: string;
      totalPrice: number;
      eventDateLabel?: string;
      items: { name: string; quantity: number; lineTotal: number }[];
      cancelledAtLabel?: string;
    },
    club: {
      clubName: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    },
    options: { initiatedByStaff?: boolean } = {}
  ) {
    const smtp = await getSmtpConfig();
    const transporter = createTransporter(smtp);
    if (!transporter) {
      logger.info('SMTP nicht konfiguriert – Stornierungs-E-Mail wird übersprungen');
      return;
    }

    const statusUrl = `${config.corsOrigin.replace(/\/$/, '')}/status/${order.id}`;
    const itemsList = order.items
      .map((i) => `${i.quantity}× ${i.name} – ${formatPrice(i.lineTotal)}`)
      .join('<br>');

    const contactLines = [
      club.contactName && `Ansprechpartner: ${escapeHtml(club.contactName)}`,
      club.email && `E-Mail: ${escapeHtml(club.email)}`,
      club.phone && `Telefon: ${escapeHtml(club.phone)}`,
      club.address && `Adresse: ${escapeHtml(club.address)}`,
    ].filter(Boolean);

    const introText = options.initiatedByStaff
      ? `Ihre Bestellung bei <strong>${escapeHtml(club.clubName)}</strong> wurde storniert.`
      : `Sie haben Ihre Bestellung bei <strong>${escapeHtml(club.clubName)}</strong> erfolgreich storniert.`;

    const customBlock = formatCustomEmailBlock(await getEmailCustomText());

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
        <h2>Stornierungsbestätigung</h2>
        ${customBlock}
        <p>${introText}</p>
        <p><strong>Abholnummer: ${escapeHtml(order.displayNumber)}</strong></p>
        ${order.eventDateLabel ? `<p><strong>Veranstaltungstag:</strong> ${escapeHtml(order.eventDateLabel)}</p>` : ''}
        ${order.cancelledAtLabel ? `<p><strong>Storniert am:</strong> ${escapeHtml(order.cancelledAtLabel)}</p>` : ''}

        <h3>Stornierte Bestellung</h3>
        <p>${itemsList}</p>
        <p><strong>Gesamtbetrag (storniert): ${formatPrice(order.totalPrice)}</strong></p>

        <h3>Verkäufer / Verein</h3>
        <p><strong>${escapeHtml(club.clubName)}</strong></p>
        ${contactLines.length ? `<p>${contactLines.join('<br>')}</p>` : ''}

        <h3>Hinweise</h3>
        <p style="font-size: 0.9em; line-height: 1.5;">
          Mit dieser Stornierung ist der zuvor geschlossene Kaufvertrag aufgehoben. Es besteht
          kein Anspruch mehr auf Abholung der bestellten Speisen, und es fallen für diese Bestellung
          keine weiteren Kosten an.
          ${options.initiatedByStaff
            ? ` Falls Sie diese Stornierung nicht veranlasst haben, wenden Sie sich bitte umgehend an ${escapeHtml(club.clubName)}.`
            : ' Bewahren Sie diese E-Mail als Nachweis der Stornierung auf.'}
        </p>

        <p style="margin-top: 24px;">
          <a href="${statusUrl}" style="display: inline-block; padding: 12px 24px; background: #1976d2; color: #fff; text-decoration: none; border-radius: 4px;">
            Bestellstatus anzeigen
          </a>
        </p>
        <p style="font-size: 0.85em; color: #666;">
          Direktlink: <a href="${statusUrl}">${statusUrl}</a>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: `Stornierungsbestätigung – Abholnummer ${order.displayNumber}`,
      html,
    });

    logger.info(`Stornierungsbestätigung gesendet an ${email}`);
  },
};
