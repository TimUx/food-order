import { describe, it, expect } from 'vitest';
import { renderTemplate } from './render';
import { buildOrderConfirmationMessage, buildOrderCancellationMessage, buildKitchenCompletedMessage, buildPaymentFailedMessage } from '../services/MessageTemplateService';
import { defaultNotificationConfig } from '../config';

const testConfig = {
  ...defaultNotificationConfig,
  branding: { primaryColor: '#1976d2', locale: 'de-DE', timezone: 'Europe/Berlin' },
};

describe('notification templates', () => {
  it('replaces placeholders', () => {
    expect(renderTemplate('Hallo {{name}}!', { name: 'Verein' })).toBe('Hallo Verein!');
  });

  it('builds order confirmation in German', async () => {
    const msg = await buildOrderConfirmationMessage(
      {
        id: 'order-1',
        displayNumber: '042',
        totalPrice: 15,
        eventDateLabel: 'Samstag, 15. August 2026',
        items: [{ name: 'Bratwurst', quantity: 2, lineTotal: 9 }],
        cancellationDeadlineLabel: 'Freitag, 14. August 2026, 11:00',
      },
      { clubName: 'Feuerwehr Musterstadt', email: 'kontakt@example.de' },
      testConfig
    );
    expect(msg.title).toContain('042');
    expect(msg.body).toContain('Feuerwehr Musterstadt');
    expect(msg.html).toContain('Bestellbestätigung');
    expect(msg.html).toContain('verbindlicher Kaufvertrag');
    expect(msg.html).toContain('an der Kasse vor');
    expect(msg.html).toContain('Bestellstatus anzeigen / stornieren');
    expect(msg.body).toContain('Veranstalter: Feuerwehr Musterstadt');
  });

  it('builds cancellation with full legal notice', async () => {
    const msg = await buildOrderCancellationMessage(
      {
        id: 'order-2',
        displayNumber: '042',
        totalPrice: 15,
        items: [{ name: 'Bratwurst', quantity: 1, lineTotal: 4.5 }],
        cancelledAtLabel: 'Montag, 8. Juli 2026, 10:00',
      },
      { clubName: 'Feuerwehr Musterstadt' },
      testConfig,
      { initiatedByStaff: true },
    );
    expect(msg.html).toContain('Kaufvertrag aufgehoben');
    expect(msg.html).toContain('Gesamtbetrag (storniert)');
    expect(msg.body).toContain('wurde storniert');
  });

  it('builds short kitchen push text', () => {
    const msg = buildKitchenCompletedMessage({
      displayNumber: '043',
      totalPrice: 12,
      eventDateLabel: 'Samstag, 15. August 2026',
    });
    expect(msg.title).toContain('043');
    expect(msg.body).toContain('Gesamt:');
  });

  it('builds payment failed email for customers', async () => {
    const msg = await buildPaymentFailedMessage(
      { displayNumber: '042', reason: 'Karte abgelehnt' },
      { clubName: 'Feuerwehr Musterstadt', email: 'kontakt@example.de' },
      testConfig,
      {
        id: 'order-3',
        displayNumber: '042',
        totalPrice: 18.5,
        eventDateLabel: 'Samstag, 15. August 2026',
        items: [{ name: 'Bratwurst', quantity: 2, lineTotal: 9 }],
      }
    );
    expect(msg.title).toContain('042');
    expect(msg.html).toContain('Onlinezahlung fehlgeschlagen');
    expect(msg.html).toContain('Karte abgelehnt');
    expect(msg.html).toContain('Zahlung erneut versuchen');
    expect(msg.body).toContain('Karte abgelehnt');
    expect(msg.body).toContain('Feuerwehr Musterstadt');
  });

  it('builds payment failed push text without order context', async () => {
    const msg = await buildPaymentFailedMessage(
      { displayNumber: '042', reason: 'Timeout' },
      { clubName: 'Feuerwehr Musterstadt' },
      testConfig
    );
    expect(msg.title).toBe('Onlinezahlung fehlgeschlagen');
    expect(msg.body).toContain('042');
    expect(msg.html).toBeUndefined();
  });
});
