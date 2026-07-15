import type { FeatureContext } from '../../src/platform/module-api';
import type { ClubContactData, OrderEmailData } from '../../src/platform/extension-points/NotificationService';
import { orderRepository } from '../../src/repositories';
import { CORE_CLUB_NAMESPACE } from '../../src/platform/settings/SettingsNamespaces';
import { formatOrderNumber, formatPrice, formatEventDate } from '../../src/utils/helpers';
import { logger } from '../../src/utils/logger';
import { requireTenantId } from '../../src/platform/tenant/tenantScope';
import type { NotificationConfig, NotificationEventType } from './config';
import { mergeNotificationConfig } from './config';
import { isChannelEnabledForEvent, type NotificationMessage } from './NotificationChannel';
import { notificationRegistry } from './NotificationRegistry';
import { notificationDeliveryRepository } from './repositories/notificationDeliveryRepository';
import { resolveSmtpConfig } from './services/smtpResolver';
import {
  buildKitchenCompletedMessage,
  buildModuleActivatedMessage,
  buildModuleDeactivatedMessage,
  buildOrderCancellationMessage,
  buildOrderConfirmationMessage,
  buildOrderPaidMessage,
  buildPaymentFailedMessage,
  buildPaymentRefundedMessage,
  buildAdminPushNotification,
} from './services/MessageTemplateService';
import { getTenantAdminNotificationEmails } from './services/adminNotificationRecipients';

export type OrderHookPayload = {
  id: string;
  lookupToken?: string;
  displayNumber: string;
  totalPrice: number;
  eventDateLabel?: string;
  items?: { name?: string; quantity: number; lineTotal?: number }[];
  customer?: { email?: string | null } | null;
  cancellationDeadlineLabel?: string;
  cancelledAtLabel?: string;
  initiatedByStaff?: boolean;
  source?: string;
};

type PaymentFailedHookPayload = {
  resourceType: string;
  resourceId: string;
  reason?: string;
  displayNumber?: string;
  amountCents?: number;
};

type PaymentRefundedHookPayload = {
  transactionId: string;
  amountCents?: number;
};

type ModuleHookPayload = {
  moduleId: string;
};

const MODULE_LABELS: Record<string, string> = {
  payment: 'Online-Zahlung',
  notifications: 'Benachrichtigungen',
  printer: 'Bondruck',
  legal: 'Rechtliche Informationen',
};

async function loadClubContact(context: FeatureContext): Promise<ClubContactData> {
  const values = await context.settings.getDecryptedValues(CORE_CLUB_NAMESPACE);
  return {
    clubName: String(values.clubName ?? 'Veranstalter'),
    contactName: (values.contactName as string | undefined) ?? undefined,
    email: (values.email as string | undefined) ?? undefined,
    phone: (values.phone as string | undefined) ?? undefined,
    address: (values.address as string | undefined) ?? undefined,
  };
}

function toOrderEmailData(payload: OrderHookPayload): OrderEmailData {
  if (!payload.lookupToken) {
    throw new Error(`ORDER_CREATED payload missing lookupToken for order ${payload.id}`);
  }
  return {
    id: payload.id,
    lookupToken: payload.lookupToken,
    displayNumber: payload.displayNumber,
    totalPrice: payload.totalPrice,
    eventDateLabel: payload.eventDateLabel,
    cancellationDeadlineLabel: payload.cancellationDeadlineLabel,
    cancelledAtLabel: payload.cancelledAtLabel,
    items: (payload.items ?? []).map((i) => ({
      name: i.name ?? 'Artikel',
      quantity: i.quantity,
      lineTotal: i.lineTotal ?? 0,
    })),
  };
}

async function resolveOrderDisplayNumber(
  resourceType: string,
  resourceId: string,
  displayNumber?: string
): Promise<string> {
  if (displayNumber) return displayNumber;
  if (resourceType === 'order' && resourceId) {
    const order = await orderRepository.findById(resourceId);
    if (order) return formatOrderNumber(order.orderNumber);
  }
  return resourceId.slice(0, 8);
}

async function loadOrderNotificationData(
  resourceType: string,
  resourceId: string,
  displayNumber: string
): Promise<{ order: OrderEmailData; recipientEmail: string } | null> {
  if (resourceType !== 'order' || !resourceId) return null;

  const order = await orderRepository.findById(resourceId);
  if (!order) return null;

  const recipientEmail = order.customer?.email?.trim();
  if (!recipientEmail) return null;

  return {
    recipientEmail,
    order: {
      id: order.id,
      lookupToken: order.lookupToken,
      displayNumber,
      totalPrice: Number(order.totalPrice),
      eventDateLabel: formatEventDate(order.orderDate),
      items: order.items.map((item) => ({
        name: item.foodItem.name,
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),
      })),
    },
  };
}

class NotificationManager {
  private async loadConfig(context: FeatureContext): Promise<NotificationConfig> {
    const current = await context.getConfig<Partial<NotificationConfig>>('notifications');
    return mergeNotificationConfig(current);
  }

  private async resolveConfig(context: FeatureContext): Promise<NotificationConfig> {
    const tenantConfig = await this.loadConfig(context);
    const smtp = await resolveSmtpConfig(tenantConfig);
    const resolvedSmtp = {
      ...smtp,
      enabled: Boolean(smtp.host?.trim()) && smtp.enabled !== false ? true : smtp.enabled,
    };
    return {
      ...tenantConfig,
      smtp: resolvedSmtp,
    };
  }

  async hasActiveChannel(context: FeatureContext): Promise<boolean> {
    const config = await this.resolveConfig(context);
    return notificationRegistry.getConfigured(config).length > 0;
  }

  async runHealthChecks(context: FeatureContext): Promise<Record<string, { ok: boolean; message?: string }>> {
    const config = await this.resolveConfig(context);
    const results: Record<string, { ok: boolean; message?: string }> = {};
    for (const channel of notificationRegistry.getAll()) {
      if (!channel.isConfigured(config)) {
        results[channel.id] = { ok: false, message: 'Nicht konfiguriert' };
        continue;
      }
      if (channel.testConnection) {
        results[channel.id] = await channel.testConnection(config);
      } else {
        results[channel.id] = { ok: true, message: 'Bereit' };
      }
    }
    return results;
  }

  async testChannel(context: FeatureContext, channelId: string) {
    const channel = notificationRegistry.get(channelId);
    if (!channel?.testConnection) {
      return { ok: false, message: 'Kanal nicht gefunden' };
    }

    if (channelId === 'email') {
      const { mailService } = await import('../../src/platform/mail/MailService');
      const result = await mailService.testConnection();
      if (!result.ok) {
        return result;
      }

      try {
        const tenantConfig = await this.loadConfig(context);
        const branding = tenantConfig.smtp ?? {};
        const override = [branding.senderName, branding.from].map((v) => String(v ?? '').trim()).filter(Boolean);
        const suffix = override.length > 0 ? ` – Absender-Override: ${override.join(' / ')}` : '';
        return { ok: true, message: `${result.message}${suffix}` };
      } catch {
        return result;
      }
    }

    const config = await this.resolveConfig(context);
    return channel.testConnection(config);
  }

  private async dispatch(
    context: FeatureContext,
    event: NotificationEventType,
    message: NotificationMessage
  ): Promise<void> {
    const config = await this.resolveConfig(context);
    const tenantId = requireTenantId();

    const tasks = notificationRegistry
      .getAll()
      .filter((channel) => isChannelEnabledForEvent(config, event, channel.id))
      .filter((channel) => channel.isConfigured(config))
      .map(async (channel) => {
        const result = await channel.send(config, message);
        const recipient =
          channel.id === 'email' ? message.recipientEmail ?? undefined : channel.id;

        await notificationDeliveryRepository.log({
          eventType: event,
          channelId: channel.id,
          recipient,
          status: result.ok ? 'sent' : 'failed',
          errorMessage: result.ok ? undefined : result.error,
          smtpSource: channel.id === 'email' ? config.smtp.source : undefined,
        });

        if (result.ok) {
          logger.info(`Benachrichtigung [${event}/${channel.id}]`, { tenant_id: tenantId });
        } else {
          logger.warn(`Benachrichtigung fehlgeschlagen [${event}/${channel.id}]`, {
            tenant_id: tenantId,
            error: result.error,
          });
        }
      });
    await Promise.allSettled(tasks);
  }

  private async dispatchAdminEmails(
    context: FeatureContext,
    event: NotificationEventType,
    message: Pick<NotificationMessage, 'title' | 'body' | 'html' | 'priority'>
  ): Promise<void> {
    const config = await this.resolveConfig(context);
    if (!isChannelEnabledForEvent(config, event, 'email')) return;

    const emailChannel = notificationRegistry.get('email');
    if (!emailChannel?.isConfigured(config)) return;

    const recipients = await getTenantAdminNotificationEmails();
    if (!recipients.length) return;

    const tenantId = requireTenantId();

    await Promise.allSettled(
      recipients.map(async (recipientEmail) => {
        const result = await emailChannel.send(config, {
          ...message,
          recipientEmail,
        });

        await notificationDeliveryRepository.log({
          eventType: event,
          channelId: 'email',
          recipient: recipientEmail,
          status: result.ok ? 'sent' : 'failed',
          errorMessage: result.ok ? undefined : result.error,
          smtpSource: config.smtp.source,
        });

        if (result.ok) {
          logger.info(`Admin-Benachrichtigung [${event}/email]`, {
            tenant_id: tenantId,
            recipient: recipientEmail,
          });
        } else {
          logger.warn(`Admin-Benachrichtigung fehlgeschlagen [${event}/email]`, {
            tenant_id: tenantId,
            recipient: recipientEmail,
            error: result.error,
          });
        }
      })
    );
  }

  async handleOrderCreated(context: FeatureContext, payload: OrderHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);

    const adminMessage = buildAdminPushNotification(
      'orderCreated',
      {
        displayNumber: payload.displayNumber,
        clubName: club.clubName,
        totalPrice: formatPrice(payload.totalPrice),
        eventDateLabel: payload.eventDateLabel ?? '',
      },
      config
    );
    if (adminMessage) {
      await this.dispatchAdminEmails(context, 'orderCreated', {
        ...adminMessage,
        priority: 'high',
      });
    }

    const email = payload.customer?.email?.trim();
    if (!email) return;

    const template = await buildOrderConfirmationMessage(
      toOrderEmailData(payload),
      club,
      config,
      config.emailCustomText
    );
    await this.dispatch(context, 'orderCreated', {
      ...template,
      recipientEmail: email,
      priority: 'normal',
    });
  }

  async handleOrderCancelled(context: FeatureContext, payload: OrderHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);

    const adminMessage = buildAdminPushNotification(
      'orderCancelled',
      {
        displayNumber: payload.displayNumber,
        clubName: club.clubName,
        totalPrice: formatPrice(payload.totalPrice),
        eventDateLabel: payload.eventDateLabel ?? '',
      },
      config
    );
    if (adminMessage) {
      await this.dispatchAdminEmails(context, 'orderCancelled', {
        ...adminMessage,
        priority: 'normal',
      });
    }

    if (payload.source !== 'ONLINE') return;
    const email = payload.customer?.email?.trim();
    if (!email) return;

    const template = await buildOrderCancellationMessage(
      toOrderEmailData(payload),
      club,
      config,
      { initiatedByStaff: Boolean(payload.initiatedByStaff) },
      config.emailCustomText
    );
    await this.dispatch(context, 'orderCancelled', {
      ...template,
      recipientEmail: email,
      priority: 'normal',
    });
  }

  async handleOrderPaid(context: FeatureContext, payload: OrderHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);

    const adminMessage = buildAdminPushNotification(
      'orderPaid',
      {
        displayNumber: payload.displayNumber,
        clubName: club.clubName,
        totalPrice: formatPrice(payload.totalPrice),
      },
      config
    );
    if (adminMessage) {
      await this.dispatchAdminEmails(context, 'orderPaid', {
        ...adminMessage,
        priority: 'high',
      });
    }

    const template = buildOrderPaidMessage(toOrderEmailData(payload), club);
    await this.dispatch(context, 'orderPaid', {
      ...template,
      recipientEmail: payload.customer?.email ?? undefined,
      priority: 'high',
    });
  }

  async handleKitchenCompleted(context: FeatureContext, payload: OrderHookPayload): Promise<void> {
    const config = await this.resolveConfig(context);
    const adminMessage = buildAdminPushNotification(
      'kitchenCompleted',
      {
        displayNumber: payload.displayNumber,
        totalPrice: formatPrice(payload.totalPrice),
        eventDateLabel: payload.eventDateLabel ? `Veranstaltung: ${payload.eventDateLabel}` : '',
      },
      config
    );
    if (adminMessage) {
      await this.dispatchAdminEmails(context, 'kitchenCompleted', {
        ...adminMessage,
        priority: 'high',
      });
    }

    const template = buildKitchenCompletedMessage({
      displayNumber: payload.displayNumber,
      totalPrice: payload.totalPrice,
      eventDateLabel: payload.eventDateLabel,
    });
    await this.dispatch(context, 'kitchenCompleted', {
      ...template,
      priority: 'high',
    });
  }

  async handlePaymentFailed(context: FeatureContext, payload: PaymentFailedHookPayload): Promise<void> {
    const displayNumber = await resolveOrderDisplayNumber(
      payload.resourceType,
      payload.resourceId,
      payload.displayNumber
    );
    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);
    const orderData = await loadOrderNotificationData(
      payload.resourceType,
      payload.resourceId,
      displayNumber
    );
    const template = await buildPaymentFailedMessage(
      { displayNumber, reason: payload.reason },
      club,
      config,
      orderData?.order
    );

    const adminMessage = buildAdminPushNotification(
      'paymentFailed',
      {
        displayNumber,
        reason: payload.reason?.trim() || 'Unbekannter Fehler',
      },
      config
    );
    if (adminMessage) {
      await this.dispatchAdminEmails(context, 'paymentFailed', {
        ...adminMessage,
        priority: 'high',
      });
    }

    await this.dispatch(context, 'paymentFailed', {
      ...template,
      recipientEmail: orderData?.recipientEmail,
      priority: 'high',
    });
  }

  async handlePaymentRefunded(context: FeatureContext, payload: PaymentRefundedHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);
    const displayNumber = payload.transactionId.slice(-8);
    const amount = formatPrice((payload.amountCents ?? 0) / 100);

    const adminMessage = buildAdminPushNotification(
      'paymentRefunded',
      {
        displayNumber,
        amount,
        clubName: club.clubName,
      },
      config
    );
    if (adminMessage) {
      await this.dispatchAdminEmails(context, 'paymentRefunded', {
        ...adminMessage,
        priority: 'normal',
      });
    }

    const template = buildPaymentRefundedMessage({
      displayNumber,
      amount,
      clubName: club.clubName,
    });
    await this.dispatch(context, 'paymentRefunded', {
      ...template,
      priority: 'normal',
    });
  }

  async handleModuleActivated(context: FeatureContext, payload: ModuleHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);
    const moduleLabel = MODULE_LABELS[payload.moduleId] ?? payload.moduleId;

    const adminMessage = buildAdminPushNotification(
      'moduleActivated',
      { moduleLabel, clubName: club.clubName },
      config
    );
    if (adminMessage) {
      await this.dispatchAdminEmails(context, 'moduleActivated', {
        ...adminMessage,
        priority: 'low',
      });
    }

    const template = buildModuleActivatedMessage({ moduleLabel, clubName: club.clubName });
    await this.dispatch(context, 'moduleActivated', {
      ...template,
      priority: 'low',
    });
  }

  async handleModuleDeactivated(context: FeatureContext, payload: ModuleHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);
    const moduleLabel = MODULE_LABELS[payload.moduleId] ?? payload.moduleId;

    const adminMessage = buildAdminPushNotification(
      'moduleDeactivated',
      { moduleLabel, clubName: club.clubName },
      config
    );
    if (adminMessage) {
      await this.dispatchAdminEmails(context, 'moduleDeactivated', {
        ...adminMessage,
        priority: 'low',
      });
    }

    const template = buildModuleDeactivatedMessage({ moduleLabel, clubName: club.clubName });
    await this.dispatch(context, 'moduleDeactivated', {
      ...template,
      priority: 'low',
    });
  }
}

export const notificationManager = new NotificationManager();
