import { describe, it, expect } from 'vitest';
import { buildAdminPushNotification } from './MessageTemplateService';

describe('buildAdminPushNotification', () => {
  it('renders order created admin mail from push templates', () => {
    const message = buildAdminPushNotification('orderCreated', {
      displayNumber: '42',
      clubName: 'ASV Libelle',
      totalPrice: '24,50 €',
      eventDateLabel: 'Samstag, 05. September 2026',
    });

    expect(message).toEqual({
      title: 'Neue Bestellung 42',
      body: 'ASV Libelle: 24,50 € – Samstag, 05. September 2026',
    });
  });

  it('returns null for unknown events', () => {
    expect(buildAdminPushNotification('unknown' as 'orderCreated', {})).toBeNull();
  });
});
