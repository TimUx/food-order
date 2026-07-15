import { getLegalContentRegistry } from '../../../src/core/extensionPoints';
import { formatPrice } from '../../../src/utils/helpers';
import type { ClubContactData, OrderEmailData } from '../../../src/platform/extension-points/NotificationService';
import type { NotificationConfig, NotificationEventType } from '../config';
import { legalNotices, notificationTemplates } from '../templates/de';
import { renderTemplate } from '../templates/render';
import type { NotificationLocale } from '../templates/types';
import { resolveEmailBranding, wrapEmailHtml } from './notificationBranding';
import { resolveTenantPublicBaseUrl } from './notificationTenantContext';

const DEFAULT_LOCALE: NotificationLocale = 'de';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCustomEmailBlock(text?: string | null): string {
  const trimmed = text?.trim();
  if (!trimmed) return '';
  const html = escapeHtml(trimmed).replace(/\r?\n/g, '<br>');
  return `<div style="margin: 16px 0; padding: 12px 16px; background: #f5f5f5; border-radius: 4px; line-height: 1.5;">${html}</div>`;
}

function contactLines(club: ClubContactData, asHtml: boolean): string {
  const lines = [
    club.contactName && `Ansprechpartner: ${club.contactName}`,
    club.email && `E-Mail: ${club.email}`,
    club.phone && `Telefon: ${club.phone}`,
    club.address && `Adresse: ${club.address}`,
  ].filter(Boolean) as string[];

  if (!lines.length) return '';
  if (asHtml) {
    return `<p>${lines.map((l) => escapeHtml(l)).join('<br>')}</p>`;
  }
  return lines.join('\n');
}

function getTemplates(locale: NotificationLocale = DEFAULT_LOCALE, config?: NotificationConfig) {
  const base = notificationTemplates[locale];
  if (!config?.templates) return base;

  const merged = structuredClone(base) as typeof base;
  for (const [eventKey, overrides] of Object.entries(config.templates)) {
    const event = (merged as Record<string, Record<string, string> | string>)[eventKey];
    if (event && overrides && typeof event === 'object') {
      Object.assign(event, overrides);
    }
  }
  return merged;
}

function baseOrderVars(
  order: OrderEmailData,
  club: ClubContactData,
  config: NotificationConfig,
  emailCustomText?: string
) {
  const branding = resolveEmailBranding(config);
  const statusUrl = `${branding.baseUrl}/status/${order.lookupToken}`;
  const itemsHtml = order.items
    .map((i) => `${i.quantity}× ${escapeHtml(i.name)} – ${formatPrice(i.lineTotal)}`)
    .join('<br>');
  const itemsText = order.items
    .map((i) => `${i.quantity}× ${i.name} – ${formatPrice(i.lineTotal)}`)
    .join('\n');

  const cancellationDeadlineInline = order.cancellationDeadlineLabel
    ? ` Die Stornierungsfrist endet am ${escapeHtml(order.cancellationDeadlineLabel)}.`
    : '';

  const legalNoticeHtml = renderTemplate(legalNotices.de.orderConfirmation, {
    clubName: escapeHtml(club.clubName),
    cancellationDeadlineInline,
  });

  const cancellationNoteHtml = order.cancellationDeadlineLabel
    ? `<p>Stornierungen sind bis <strong>${escapeHtml(order.cancellationDeadlineLabel)}</strong> möglich.</p>`
    : '';

  const cancellationNoteText = order.cancellationDeadlineLabel
    ? renderTemplate(legalNotices.de.cancellationDeadline, {
        cancellationDeadlineLabel: order.cancellationDeadlineLabel,
      })
    : '';

  const eventDateBlockHtml = order.eventDateLabel
    ? `<p><strong>Veranstaltungstag:</strong> ${escapeHtml(order.eventDateLabel)}</p>`
    : '';

  return {
    clubName: club.clubName,
    displayNumber: order.displayNumber,
    eventDateLabel: order.eventDateLabel ?? '',
    eventDateBlockHtml,
    itemsHtml,
    itemsText,
    totalPrice: formatPrice(order.totalPrice),
    statusUrl,
    primaryColor: branding.primaryColor,
    cancellationNoteHtml,
    cancellationNoteText,
    contactHtml: contactLines(club, true),
    contactText: contactLines(club, false),
    customBlockHtml: formatCustomEmailBlock(emailCustomText),
    legalNoticeHtml,
    privacyFooterHtml: '',
    privacyFooterText: '',
  };
}

async function buildLegalFooter(clubName: string): Promise<{ html: string; text: string }> {
  const registry = getLegalContentRegistry();
  if (!registry.isAvailable()) {
    return { html: '', text: '' };
  }

  const links = await registry.listPublicLinks();
  if (links.length === 0) {
    return { html: '', text: '' };
  }

  const baseUrl = resolveTenantPublicBaseUrl();
  const htmlLinks = links
    .map((link) => `<a href="${baseUrl}${link.path}">${escapeHtml(link.title)}</a>`)
    .join(' | ');
  const textLinks = links
    .map((link) => `${link.title}: ${baseUrl}${link.path}`)
    .join('\n');

  return {
    html: `<p style="font-size: 0.8em; color: #666; line-height: 1.5;">${escapeHtml(clubName)} · ${htmlLinks}</p>`,
    text: textLinks,
  };
}

export function buildOrderConfirmationMessage(
  order: OrderEmailData,
  club: ClubContactData,
  config: NotificationConfig,
  emailCustomText?: string
): Promise<{ title: string; body: string; html: string }> {
  return (async () => {
    const t = getTemplates(DEFAULT_LOCALE, config);
    const vars = baseOrderVars(order, club, config, emailCustomText);
    const legalFooter = await buildLegalFooter(club.clubName);
    const branding = resolveEmailBranding(config);
    const innerHtml = renderTemplate(t.orderCreated.html, vars);
    return {
      title: renderTemplate(t.orderCreated.emailSubject, vars),
      body: [renderTemplate(t.orderCreated.text, vars), legalFooter.text, branding.signatureText]
        .filter(Boolean)
        .join('\n\n'),
      html: [wrapEmailHtml(innerHtml, branding), legalFooter.html].filter(Boolean).join('\n'),
    };
  })();
}

export function buildOrderCancellationMessage(
  order: OrderEmailData,
  club: ClubContactData,
  config: NotificationConfig,
  options: { initiatedByStaff?: boolean } = {},
  emailCustomText?: string
): Promise<{ title: string; body: string; html: string }> {
  return (async () => {
    const t = getTemplates(DEFAULT_LOCALE, config);
    const vars = baseOrderVars(order, club, config, emailCustomText);
    const introHtml = options.initiatedByStaff
      ? renderTemplate(t.orderCancelled.introStaffHtml, { clubName: escapeHtml(club.clubName) })
      : renderTemplate(t.orderCancelled.introCustomerHtml, { clubName: escapeHtml(club.clubName) });
    const introText = options.initiatedByStaff
      ? renderTemplate(t.orderCancelled.introStaffText, vars)
      : renderTemplate(t.orderCancelled.introCustomerText, vars);

    const cancellationLegalHtml = renderTemplate(
      options.initiatedByStaff
        ? legalNotices.de.orderCancellationStaff
        : legalNotices.de.orderCancellationCustomer,
      { clubName: escapeHtml(club.clubName) }
    );

    const cancelledAtBlockHtml = order.cancelledAtLabel
      ? `<p><strong>Storniert am:</strong> ${escapeHtml(order.cancelledAtLabel)}</p>`
      : '';

    const fullVars = {
      ...vars,
      introHtml,
      introText,
      cancelledAtLabel: order.cancelledAtLabel ?? '',
      cancelledAtBlockHtml,
      cancellationLegalHtml,
    };
    const legalFooter = await buildLegalFooter(club.clubName);
    const branding = resolveEmailBranding(config);
    const innerHtml = renderTemplate(t.orderCancelled.html, fullVars);

    return {
      title: renderTemplate(t.orderCancelled.emailSubject, fullVars),
      body: [renderTemplate(t.orderCancelled.text, fullVars), legalFooter.text, branding.signatureText]
        .filter(Boolean)
        .join('\n\n'),
      html: [wrapEmailHtml(innerHtml, branding), legalFooter.html].filter(Boolean).join('\n'),
    };
  })();
}

export function buildKitchenCompletedMessage(order: {
  displayNumber: string;
  totalPrice: number;
  eventDateLabel?: string;
}) {
  const t = getTemplates();
  const vars = {
    displayNumber: order.displayNumber,
    totalPrice: formatPrice(order.totalPrice),
    eventDateLabel: order.eventDateLabel ? `Veranstaltung: ${order.eventDateLabel}` : '',
  };
  const body = [
    renderTemplate(t.kitchenCompleted.pushTitle, vars),
    vars.eventDateLabel,
    `Gesamt: ${vars.totalPrice}`,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    title: renderTemplate(t.kitchenCompleted.pushTitle, vars),
    body,
  };
}

export function buildOrderPaidMessage(order: OrderEmailData, club: ClubContactData) {
  const t = getTemplates();
  const vars = {
    displayNumber: order.displayNumber,
    clubName: club.clubName,
    totalPrice: formatPrice(order.totalPrice),
  };
  const title = renderTemplate(t.orderPaid.pushTitle, vars);
  const body = [title, `Veranstalter: ${club.clubName}`, `Betrag: ${formatPrice(order.totalPrice)}`].join('\n');
  return { title, body };
}

export function buildPaymentFailedMessage(
  payload: { displayNumber: string; reason?: string },
  club: ClubContactData,
  config: NotificationConfig,
  order?: OrderEmailData | null
): Promise<{ title: string; body: string; html?: string }> {
  return (async () => {
    const t = getTemplates(DEFAULT_LOCALE, config);
    const reason = payload.reason?.trim() || 'Unbekannter Fehler';
    const pushVars = {
      displayNumber: payload.displayNumber,
      reason,
    };

    if (!order) {
      return {
        title: renderTemplate(t.paymentFailed.pushTitle, pushVars),
        body: renderTemplate(t.paymentFailed.pushBody, pushVars),
      };
    }

    const vars = {
      ...baseOrderVars(order, club, config),
      reason: escapeHtml(reason),
      reasonText: reason,
    };
    const legalFooter = await buildLegalFooter(club.clubName);
    const branding = resolveEmailBranding(config);
    const innerHtml = renderTemplate(t.paymentFailed.html, vars);

    return {
      title: renderTemplate(t.paymentFailed.emailSubject, {
        ...vars,
        reason: reason,
      }),
      body: [
        renderTemplate(t.paymentFailed.text, {
          ...vars,
          reason: reason,
        }),
        legalFooter.text,
        branding.signatureText,
      ]
        .filter(Boolean)
        .join('\n\n'),
      html: [wrapEmailHtml(innerHtml, branding), legalFooter.html].filter(Boolean).join('\n'),
    };
  })();
}

export function buildPaymentRefundedMessage(payload: {
  displayNumber: string;
  amount: string;
  clubName: string;
}) {
  const t = getTemplates();
  return {
    title: renderTemplate(t.paymentRefunded.pushTitle, payload),
    body: renderTemplate(t.paymentRefunded.pushBody, payload),
  };
}

export function buildModuleActivatedMessage(payload: { moduleLabel: string; clubName: string }) {
  const t = getTemplates();
  return {
    title: renderTemplate(t.moduleActivated.pushTitle, payload),
    body: renderTemplate(t.moduleActivated.pushBody, payload),
  };
}

export function buildModuleDeactivatedMessage(payload: { moduleLabel: string; clubName: string }) {
  const t = getTemplates();
  return {
    title: renderTemplate(t.moduleDeactivated.pushTitle, payload),
    body: renderTemplate(t.moduleDeactivated.pushBody, payload),
  };
}

export function buildChannelTestMessage(clubName: string) {
  const t = getTemplates();
  const vars = { clubName };
  return {
    title: renderTemplate(t.channelTest.title, vars),
    body: renderTemplate(t.channelTest.body, vars),
  };
}

const ADMIN_PUSH_EVENTS = new Set<NotificationEventType>([
  'orderCreated',
  'orderCancelled',
  'orderPaid',
  'kitchenCompleted',
  'paymentFailed',
  'paymentRefunded',
  'moduleActivated',
  'moduleDeactivated',
]);

/** Kurznachricht für Admin-E-Mails (Push-Vorlagen). */
export function buildAdminPushNotification(
  event: NotificationEventType,
  vars: Record<string, string | number | undefined>,
  config?: NotificationConfig
): { title: string; body: string } | null {
  if (!ADMIN_PUSH_EVENTS.has(event)) return null;

  const t = getTemplates(DEFAULT_LOCALE, config);
  const template = t[event as keyof typeof t];
  if (!template || typeof template !== 'object' || !('pushTitle' in template)) {
    return null;
  }

  const normalized = Object.fromEntries(
    Object.entries(vars).map(([key, value]) => [key, String(value ?? '')])
  ) as Record<string, string>;

  return {
    title: renderTemplate(template.pushTitle, normalized),
    body: renderTemplate(template.pushBody, normalized),
  };
}
