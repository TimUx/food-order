import { z } from 'zod';

const channelEnabledSchema = z.object({
  enabled: z.boolean().default(false),
});

export const notificationsConfigSchema = z.object({
  events: z.object({
    orderCreated: z.object({
      email: z.boolean().default(true),
      ntfy: z.boolean().default(false),
      discord: z.boolean().default(false),
      slack: z.boolean().default(false),
      teams: z.boolean().default(false),
    }).default({}),
    orderCancelled: z.object({
      email: z.boolean().default(true),
      ntfy: z.boolean().default(false),
      discord: z.boolean().default(false),
      slack: z.boolean().default(false),
      teams: z.boolean().default(false),
    }).default({}),
    orderPaid: z.object({
      email: z.boolean().default(true),
      ntfy: z.boolean().default(false),
      discord: z.boolean().default(false),
      slack: z.boolean().default(false),
      teams: z.boolean().default(false),
    }).default({}),
    kitchenCompleted: z.object({
      email: z.boolean().default(false),
      ntfy: z.boolean().default(true),
      discord: z.boolean().default(false),
      slack: z.boolean().default(false),
      teams: z.boolean().default(false),
    }).default({}),
    paymentFailed: z.object({
      email: z.boolean().default(false),
      ntfy: z.boolean().default(true),
      discord: z.boolean().default(false),
      slack: z.boolean().default(false),
      teams: z.boolean().default(false),
    }).default({}),
    paymentRefunded: z.object({
      email: z.boolean().default(false),
      ntfy: z.boolean().default(false),
      discord: z.boolean().default(false),
      slack: z.boolean().default(false),
      teams: z.boolean().default(false),
    }).default({}),
    moduleActivated: z.object({
      email: z.boolean().default(false),
      ntfy: z.boolean().default(false),
      discord: z.boolean().default(false),
      slack: z.boolean().default(false),
      teams: z.boolean().default(false),
    }).default({}),
    moduleDeactivated: z.object({
      email: z.boolean().default(false),
      ntfy: z.boolean().default(false),
      discord: z.boolean().default(false),
      slack: z.boolean().default(false),
      teams: z.boolean().default(false),
    }).default({}),
  }).default({}),
  smtp: channelEnabledSchema.extend({
    from: z.string().optional(),
    senderName: z.string().optional(),
    replyTo: z.string().optional(),
    source: z.literal('platform').default('platform'),
  }).default({ enabled: true, source: 'platform' }),
  branding: z.object({
    senderName: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string().default('#1976d2'),
    footerText: z.string().optional(),
    signature: z.string().optional(),
    locale: z.string().default('de-DE'),
    timezone: z.string().default('Europe/Berlin'),
  }).default({}),
  templates: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  emailCustomText: z.string().optional(),
  ntfy: channelEnabledSchema.extend({
    serverUrl: z.string().default('https://ntfy.sh'),
    topic: z.string().optional(),
    token: z.string().optional(),
  }).default({ enabled: false, serverUrl: 'https://ntfy.sh' }),
  discord: channelEnabledSchema.extend({
    webhookUrl: z.string().optional(),
  }).default({ enabled: false }),
  slack: channelEnabledSchema.extend({
    webhookUrl: z.string().optional(),
  }).default({ enabled: false }),
  teams: channelEnabledSchema.extend({
    webhookUrl: z.string().optional(),
  }).default({ enabled: false }),
});

export type NotificationConfig = z.infer<typeof notificationsConfigSchema>;

export const defaultNotificationConfig: NotificationConfig = {
  events: {
    orderCreated: { email: true, ntfy: false, discord: false, slack: false, teams: false },
    orderCancelled: { email: true, ntfy: false, discord: false, slack: false, teams: false },
    orderPaid: { email: false, ntfy: false, discord: false, slack: false, teams: false },
    kitchenCompleted: { email: false, ntfy: true, discord: false, slack: false, teams: false },
    paymentFailed: { email: false, ntfy: true, discord: false, slack: false, teams: false },
    paymentRefunded: { email: false, ntfy: false, discord: false, slack: false, teams: false },
    moduleActivated: { email: false, ntfy: false, discord: false, slack: false, teams: false },
    moduleDeactivated: { email: false, ntfy: false, discord: false, slack: false, teams: false },
  },
  smtp: { enabled: true, source: 'platform' as const },
  branding: { primaryColor: '#1976d2', locale: 'de-DE', timezone: 'Europe/Berlin' },
  ntfy: { enabled: false, serverUrl: 'https://ntfy.sh' },
  discord: { enabled: false },
  slack: { enabled: false },
  teams: { enabled: false },
};

export type NotificationEventType =
  | 'orderCreated'
  | 'orderCancelled'
  | 'orderPaid'
  | 'kitchenCompleted'
  | 'paymentFailed'
  | 'paymentRefunded'
  | 'moduleActivated'
  | 'moduleDeactivated';

export type NotificationChannelId = 'email' | 'ntfy' | 'discord' | 'slack' | 'teams';
