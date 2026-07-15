import type { MailTemplateId } from './types';

export interface TemplateContext {
  platformName?: string;
  tenantName?: string;
  code?: string;
  magicLink?: string;
  recipientName?: string;
  expiresMinutes?: number;
  adminUrl?: string;
  staffUrl?: string;
  publicUrl?: string;
  statusUrl?: string;
  tipsUrl?: string;
}

export function renderMailTemplate(
  templateId: MailTemplateId,
  context: TemplateContext
): { subject: string; text: string; html: string } {
  const platform = context.platformName ?? 'FestSchmiede';
  const tenant = context.tenantName ?? platform;

  switch (templateId) {
    case 'login-code':
      return {
        subject: `${platform} – Ihr Anmeldecode`,
        text: [
          `Hallo${context.recipientName ? ` ${context.recipientName}` : ''},`,
          '',
          `Ihr Anmeldecode für ${tenant} lautet: ${context.code}`,
          '',
          `Der Code ist ${context.expiresMinutes ?? 10} Minuten gültig und kann nur einmal verwendet werden.`,
          '',
          'Falls Sie diese Anmeldung nicht angefordert haben, ignorieren Sie diese E-Mail.',
        ].join('\n'),
        html: `<p>Hallo${context.recipientName ? ` ${context.recipientName}` : ''},</p>
          <p>Ihr Anmeldecode für <strong>${tenant}</strong> lautet:</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${context.code}</p>
          <p>Der Code ist ${context.expiresMinutes ?? 10} Minuten gültig und kann nur einmal verwendet werden.</p>
          <p><small>Falls Sie diese Anmeldung nicht angefordert haben, ignorieren Sie diese E-Mail.</small></p>`,
      };

    case 'magic-link':
      return {
        subject: `${platform} – Anmeldelink`,
        text: [
          `Hallo${context.recipientName ? ` ${context.recipientName}` : ''},`,
          '',
          `Klicken Sie auf den folgenden Link, um sich bei ${tenant} anzumelden:`,
          context.magicLink ?? '',
          '',
          `Der Link ist ${context.expiresMinutes ?? 15} Minuten gültig und kann nur einmal verwendet werden.`,
          '',
          'Falls Sie diese Anmeldung nicht angefordert haben, ignorieren Sie diese E-Mail.',
        ].join('\n'),
        html: `<p>Hallo${context.recipientName ? ` ${context.recipientName}` : ''},</p>
          <p>Klicken Sie auf den folgenden Button, um sich bei <strong>${tenant}</strong> anzumelden:</p>
          <p><a href="${context.magicLink}" style="display:inline-block;padding:12px 24px;background:#1565c0;color:#fff;text-decoration:none;border-radius:4px">Jetzt anmelden</a></p>
          <p><small>Oder kopieren Sie diesen Link: ${context.magicLink}</small></p>
          <p>Der Link ist ${context.expiresMinutes ?? 15} Minuten gültig und kann nur einmal verwendet werden.</p>
          <p><small>Falls Sie diese Anmeldung nicht angefordert haben, ignorieren Sie diese E-Mail.</small></p>`,
      };

    case 'initial-setup':
      return {
        subject: `${tenant} – Willkommen bei FestSchmiede`,
        text: [
          `Hallo${context.recipientName ? ` ${context.recipientName}` : ''},`,
          '',
          `Willkommen bei FestSchmiede! Ihr Mandant „${tenant}" wurde erfolgreich eingerichtet.`,
          '',
          'Direkte Links:',
          context.adminUrl ? `Administration: ${context.adminUrl}` : '',
          context.staffUrl ? `Service: ${context.staffUrl}` : '',
          context.publicUrl ? `Öffentliche Bestellseite: ${context.publicUrl}` : '',
          context.statusUrl ? `Bestellstatus abfragen: ${context.statusUrl}` : '',
          '',
          'Tipps für die erste Veranstaltung:',
          '- In der Administration unter „Veranstaltungen“ eine Veranstaltung anlegen/aktivieren.',
          '- Speisekarte pflegen (Gerichte, Preise, ggf. Ausverkauft-Schalter).',
          '- Online-Bestellungen öffnen/schließen und „Bestellungen geschlossen“ für Pausen nutzen.',
          '- Mitarbeiter anlegen und Rollen (Küche/Kasse/Abholung) vergeben.',
          '- Ein Probedurchlauf: 1× Online-Bestellung + 1× Vor-Ort, prüfen ob Küche/Abholung passt.',
          '',
          context.tipsUrl ? `Mehr Hinweise: ${context.tipsUrl}` : '',
          '',
          'Viel Erfolg und gutes Gelingen!',
          'Ihr FestSchmiede-Team',
        ].filter(Boolean).join('\n'),
        html: `<p>Hallo${context.recipientName ? ` ${context.recipientName}` : ''},</p>
          <p>Willkommen bei <strong>FestSchmiede</strong>! Ihr Mandant <strong>${tenant}</strong> wurde erfolgreich eingerichtet.</p>
          <h3>Direkte Links</h3>
          <ul>
            ${context.adminUrl ? `<li><a href="${context.adminUrl}">Administration</a></li>` : ''}
            ${context.staffUrl ? `<li><a href="${context.staffUrl}">Service</a></li>` : ''}
            ${context.publicUrl ? `<li><a href="${context.publicUrl}">Öffentliche Bestellseite</a></li>` : ''}
            ${context.statusUrl ? `<li><a href="${context.statusUrl}">Bestellstatus abfragen</a></li>` : ''}
          </ul>
          <h3>Tipps für die erste Veranstaltung</h3>
          <ol>
            <li>In der Administration unter <strong>„Veranstaltungen“</strong> eine Veranstaltung anlegen/aktivieren.</li>
            <li>Speisekarte pflegen (Gerichte, Preise, ggf. Ausverkauft-Schalter).</li>
            <li>Online-Bestellungen öffnen/schließen und „Bestellungen geschlossen“ für Pausen nutzen.</li>
            <li>Mitarbeiter anlegen und Rollen (Küche/Kasse/Abholung) vergeben.</li>
            <li>Probedurchlauf: 1× Online-Bestellung + 1× Vor-Ort, prüfen ob Küche/Abholung passt.</li>
          </ol>
          ${context.tipsUrl ? `<p><a href="${context.tipsUrl}">Mehr Hinweise &amp; Tipps</a></p>` : ''}
          <p>Viel Erfolg und gutes Gelingen!<br/>Ihr FestSchmiede-Team</p>`,
      };

    case 'test-mail':
      return {
        subject: `${platform} – Testmail`,
        text: [
          'Dies ist eine Testmail vom zentralen FestSchmiede-Maildienst.',
          '',
          `Gesendet am: ${new Date().toLocaleString('de-DE')}`,
          'Wenn Sie diese E-Mail erhalten haben, ist die SMTP-Konfiguration korrekt.',
        ].join('\n'),
        html: `<p>Dies ist eine <strong>Testmail</strong> vom zentralen FestSchmiede-Maildienst.</p>
          <p>Gesendet am: ${new Date().toLocaleString('de-DE')}</p>
          <p>Wenn Sie diese E-Mail erhalten haben, ist die SMTP-Konfiguration korrekt.</p>`,
      };

    case 'password-reset':
      return {
        subject: `${platform} – Passwort zurücksetzen`,
        text: [
          `Hallo${context.recipientName ? ` ${context.recipientName}` : ''},`,
          '',
          'Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:',
          context.magicLink ?? '',
          '',
          `Der Link ist ${context.expiresMinutes ?? 30} Minuten gültig.`,
        ].join('\n'),
        html: `<p>Hallo${context.recipientName ? ` ${context.recipientName}` : ''},</p>
          <p><a href="${context.magicLink}">Passwort zurücksetzen</a></p>
          <p>Der Link ist ${context.expiresMinutes ?? 30} Minuten gültig.</p>`,
      };

    default:
      return { subject: platform, text: '', html: '' };
  }
}
