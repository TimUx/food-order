import type { MailTemplateId } from './types';

export interface TemplateContext {
  platformName?: string;
  tenantName?: string;
  code?: string;
  magicLink?: string;
  recipientName?: string;
  expiresMinutes?: number;
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
          `Willkommen bei FestSchmiede!`,
          '',
          `Ihr Mandant „${tenant}" wurde erfolgreich eingerichtet.`,
          'Sie können sich jetzt im Administrationsbereich anmelden und Ihre erste Veranstaltung planen.',
        ].join('\n'),
        html: `<p>Willkommen bei <strong>FestSchmiede</strong>!</p>
          <p>Ihr Mandant <strong>${tenant}</strong> wurde erfolgreich eingerichtet.</p>
          <p>Sie können sich jetzt im Administrationsbereich anmelden und Ihre erste Veranstaltung planen.</p>`,
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
