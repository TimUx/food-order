import { describe, it, expect } from 'vitest';
import { notificationsConfigSchema, defaultNotificationConfig, mergeNotificationConfig } from '../config';

describe('notifications module QA', () => {
  it('default config validates', () => {
    expect(notificationsConfigSchema.parse(defaultNotificationConfig)).toBeDefined();
  });

  it('merges legacy configs without smtp branding', () => {
    const merged = mergeNotificationConfig({
      events: defaultNotificationConfig.events,
      branding: defaultNotificationConfig.branding,
    });
    expect(merged.smtp).toEqual(defaultNotificationConfig.smtp);
  });
});
