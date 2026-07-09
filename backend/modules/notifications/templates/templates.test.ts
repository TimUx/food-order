import { describe, it, expect } from 'vitest';
import { renderTemplate } from './render';
import { buildOrderConfirmationMessage, buildOrderCancellationMessage, buildKitchenCompletedMessage } from '../services/MessageTemplateService';

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
      { clubName: 'Feuerwehr Musterstadt', email: 'kontakt@example.de' }
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
});
