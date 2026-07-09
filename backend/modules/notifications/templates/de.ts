import type { NotificationLocale } from './types';

/**
 * Zentrale Textvorlagen (Deutsch).
 * Platzhalter: {{name}} – für Mehrsprachigkeit später pro Locale eigene Datei.
 */
export const notificationTemplates: Record<NotificationLocale, {
  orderCreated: {
    emailSubject: string;
    pushTitle: string;
    pushBody: string;
    html: string;
    text: string;
  };
  orderCancelled: {
    emailSubject: string;
    pushTitle: string;
    pushBody: string;
    introStaffHtml: string;
    introStaffText: string;
    introCustomerHtml: string;
    introCustomerText: string;
    html: string;
    text: string;
  };
  orderPaid: {
    pushTitle: string;
    pushBody: string;
  };
  kitchenCompleted: {
    pushTitle: string;
    pushBody: string;
  };
  paymentFailed: {
    pushTitle: string;
    pushBody: string;
  };
  paymentRefunded: {
    pushTitle: string;
    pushBody: string;
  };
  moduleActivated: {
    pushTitle: string;
    pushBody: string;
  };
  moduleDeactivated: {
    pushTitle: string;
    pushBody: string;
  };
  privacyFooterHtml: string;
  privacyFooterText: string;
  channelTest: {
    title: string;
    body: string;
  };
}> = {
  de: {
    orderCreated: {
      emailSubject: 'Bestellbestätigung – Abholnummer {{displayNumber}}',
      pushTitle: 'Neue Bestellung {{displayNumber}}',
      pushBody: '{{clubName}}: {{totalPrice}} – {{eventDateLabel}}',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
  <h2>Bestellbestätigung</h2>
  {{customBlockHtml}}
  <p>Vielen Dank für Ihre Bestellung bei <strong>{{clubName}}</strong>!</p>
  <p><strong>Ihre Abholnummer: {{displayNumber}}</strong></p>
  {{eventDateBlockHtml}}
  <p>Bitte merken Sie sich diese Nummer oder zeigen Sie sie am Veranstaltungstag an der Kasse vor.</p>
  <h3>Veranstalter</h3>
  <p><strong>{{clubName}}</strong></p>
  {{contactHtml}}
  <h3>Ihre Bestellung</h3>
  <p>{{itemsHtml}}</p>
  <p><strong>Gesamt: {{totalPrice}}</strong></p>
  <h3>Rechtliche Hinweise</h3>
  {{legalNoticeHtml}}
  {{cancellationNoteHtml}}
  <p style="margin-top: 24px;">
    <a href="{{statusUrl}}" style="display: inline-block; padding: 12px 24px; background: #1976d2; color: #fff; text-decoration: none; border-radius: 4px;">
      Bestellstatus anzeigen / stornieren
    </a>
  </p>
  <p style="font-size: 0.85em; color: #666;">
    Direktlink: <a href="{{statusUrl}}">{{statusUrl}}</a>
  </p>
</div>`.trim(),
      text: [
        'Bestellbestätigung – Abholnummer {{displayNumber}}',
        'Veranstalter: {{clubName}}',
        'Gesamt: {{totalPrice}}',
        'Status: {{statusUrl}}',
      ].join('\n'),
    },
    orderCancelled: {
      emailSubject: 'Stornierungsbestätigung – Abholnummer {{displayNumber}}',
      pushTitle: 'Bestellung {{displayNumber}} storniert',
      pushBody: '{{clubName}} – {{totalPrice}}',
      introStaffHtml: 'Ihre Bestellung bei <strong>{{clubName}}</strong> wurde storniert.',
      introStaffText: 'Ihre Bestellung bei {{clubName}} wurde storniert.',
      introCustomerHtml: 'Sie haben Ihre Bestellung bei <strong>{{clubName}}</strong> erfolgreich storniert.',
      introCustomerText: 'Sie haben Ihre Bestellung bei {{clubName}} erfolgreich storniert.',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
  <h2>Stornierungsbestätigung</h2>
  {{customBlockHtml}}
  <p>{{introHtml}}</p>
  <p><strong>Abholnummer: {{displayNumber}}</strong></p>
  {{eventDateBlockHtml}}
  {{cancelledAtBlockHtml}}
  <h3>Stornierte Bestellung</h3>
  <p>{{itemsHtml}}</p>
  <p><strong>Gesamtbetrag (storniert): {{totalPrice}}</strong></p>
  <h3>Veranstalter</h3>
  <p><strong>{{clubName}}</strong></p>
  {{contactHtml}}
  <h3>Hinweise</h3>
  {{cancellationLegalHtml}}
  <p style="margin-top: 24px;">
    <a href="{{statusUrl}}" style="display: inline-block; padding: 12px 24px; background: #1976d2; color: #fff; text-decoration: none; border-radius: 4px;">
      Bestellstatus anzeigen
    </a>
  </p>
  <p style="font-size: 0.85em; color: #666;">
    Direktlink: <a href="{{statusUrl}}">{{statusUrl}}</a>
  </p>
</div>`.trim(),
      text: [
        'Stornierungsbestätigung – Abholnummer {{displayNumber}}',
        '{{introText}}',
        'Gesamtbetrag (storniert): {{totalPrice}}',
      ].join('\n'),
    },
    orderPaid: {
      pushTitle: 'Zahlung eingegangen – {{displayNumber}}',
      pushBody: '{{clubName}}: {{totalPrice}}',
    },
    kitchenCompleted: {
      pushTitle: 'Bestellung {{displayNumber}} fertig',
      pushBody: '{{eventDateLabel}}\nGesamt: {{totalPrice}}',
    },
    paymentFailed: {
      pushTitle: 'Onlinezahlung fehlgeschlagen',
      pushBody: 'Bestellung {{displayNumber}} – {{reason}}',
    },
    paymentRefunded: {
      pushTitle: 'Rückerstattung – {{displayNumber}}',
      pushBody: '{{clubName}}: {{amount}}',
    },
    moduleActivated: {
      pushTitle: 'Funktion aktiviert',
      pushBody: '{{moduleLabel}} ist jetzt aktiv',
    },
    moduleDeactivated: {
      pushTitle: 'Funktion deaktiviert',
      pushBody: '{{moduleLabel}} wurde ausgeschaltet',
    },
    privacyFooterHtml: `
<hr style="margin: 32px 0 16px; border: none; border-top: 1px solid #ddd;">
<p style="font-size: 0.8em; color: #666; line-height: 1.5;">
  Diese Nachricht wurde im Auftrag von {{clubName}} versendet.
  Ihre Daten werden nur zur Abwicklung Ihrer Bestellung verwendet.
  Weitere Informationen finden Sie auf der Kontaktseite des Veranstalters.
</p>`.trim(),
    privacyFooterText:
      'Diese Nachricht wurde im Auftrag von {{clubName}} versendet. Ihre Daten werden nur zur Abwicklung Ihrer Bestellung verwendet.',
    channelTest: {
      title: 'Testnachricht – {{clubName}}',
      body: 'Die Benachrichtigungseinstellungen funktionieren.',
    },
  },
};

export const legalNotices = {
  de: {
    orderConfirmation: `
<p style="font-size: 0.9em; line-height: 1.5;">
  Mit Absenden Ihrer Bestellung kommt ein verbindlicher Kaufvertrag zwischen Ihnen und
  {{clubName}} zustande. Die bestellten Speisen werden am Veranstaltungstag
  zur Abholung bereitgestellt. Nicht abgeholte Bestellungen werden gleichwohl in Rechnung
  gestellt, sofern die Bestellung nicht fristgerecht storniert wurde.
  {{cancellationDeadlineInline}}
  Eine Stornierung nach Ablauf der Frist oder nach Bereitstellung der Bestellung ist nicht möglich.
</p>`.trim(),
    orderCancellationStaff: `
<p style="font-size: 0.9em; line-height: 1.5;">
  Mit dieser Stornierung ist der zuvor geschlossene Kaufvertrag aufgehoben. Es besteht
  kein Anspruch mehr auf Abholung der bestellten Speisen, und es fallen für diese Bestellung
  keine weiteren Kosten an.
  Falls Sie diese Stornierung nicht veranlasst haben, wenden Sie sich bitte umgehend an {{clubName}}.
</p>`.trim(),
    orderCancellationCustomer: `
<p style="font-size: 0.9em; line-height: 1.5;">
  Mit dieser Stornierung ist der zuvor geschlossene Kaufvertrag aufgehoben. Es besteht
  kein Anspruch mehr auf Abholung der bestellten Speisen, und es fallen für diese Bestellung
  keine weiteren Kosten an.
  Bewahren Sie diese E-Mail als Nachweis der Stornierung auf.
</p>`.trim(),
    cancellationDeadline: 'Stornierungen sind bis {{cancellationDeadlineLabel}} möglich.',
  },
};
