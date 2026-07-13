import { describe, it, expect } from 'vitest';
import { SmtpChannel } from './channels/SmtpChannel';
import { DiscordChannel } from './channels/DiscordChannel';
import { defaultNotificationConfig } from './config';
import { isChannelEnabledForEvent } from './NotificationChannel';

describe('Notification channels', () => {
  it('SMTP is configured only when enabled with host', () => {
    const smtp = new SmtpChannel();
    expect(smtp.isConfigured(defaultNotificationConfig)).toBe(false);
    expect(smtp.isConfigured({
      ...defaultNotificationConfig,
      smtp: { enabled: true, host: 'smtp.example.com', port: 587 },
    })).toBe(true);
  });

  it('Discord requires enabled webhook', () => {
    const discord = new DiscordChannel();
    expect(discord.isConfigured({
      ...defaultNotificationConfig,
      discord: { enabled: true, webhookUrl: 'https://discord.com/api/webhooks/x' },
    })).toBe(true);
    expect(discord.isConfigured(defaultNotificationConfig)).toBe(false);
  });

  it('respects event-channel mapping', () => {
    expect(isChannelEnabledForEvent(defaultNotificationConfig, 'orderCreated', 'email')).toBe(true);
    expect(isChannelEnabledForEvent(defaultNotificationConfig, 'kitchenCompleted', 'ntfy')).toBe(true);
    expect(isChannelEnabledForEvent(defaultNotificationConfig, 'kitchenCompleted', 'email')).toBe(false);
    expect(isChannelEnabledForEvent(defaultNotificationConfig, 'paymentFailed', 'email')).toBe(true);
    expect(isChannelEnabledForEvent(defaultNotificationConfig, 'paymentFailed', 'ntfy')).toBe(true);
    expect(isChannelEnabledForEvent(defaultNotificationConfig, 'moduleActivated', 'ntfy')).toBe(false);
  });
});
