import type { FeatureContext } from '../../src/module-system/types';
import type { ClubContactData, OrderEmailData } from '../../src/platform/extension-points/NotificationService';
import { orderRepository } from '../../src/repositories';
import { CORE_CLUB_NAMESPACE } from '../../src/platform/settings/SettingsNamespaces';
import { formatOrderNumber, formatPrice } from '../../src/utils/helpers';
import { logger } from '../../src/utils/logger';
import { requireTenantId } from '../../src/platform/tenant/tenantScope';
import type { NotificationConfig, NotificationEventType } from './config';
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
} from './services/MessageTemplateService';

export type OrderHookPayload = {
  id: string;
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
  return {
    id: payload.id,
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

class NotificationManager {
  private async loadConfig(context: FeatureContext): Promise<NotificationConfig> {
    return context.getConfig<NotificationConfig>('notifications');
  }

  private async resolveConfig(context: FeatureContext): Promise<NotificationConfig> {
    const tenantConfig = await this.loadConfig(context);
    const smtp = await resolveSmtpConfig(tenantConfig);
    return {
      ...tenantConfig,
      smtp: { ...smtp, enabled: Boolean(smtp.host?.trim()) && smtp.enabled !== false ? true : smtp.enabled },
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

  async handleOrderCreated(context: FeatureContext, payload: OrderHookPayload): Promise<void> {
    const email = payload.customer?.email?.trim();
    if (!email) return;

    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);
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
    if (payload.source !== 'ONLINE') return;
    const email = payload.customer?.email?.trim();
    if (!email) return;

    const club = await loadClubContact(context);
    const config = await this.resolveConfig(context);
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
    const template = buildOrderPaidMessage(toOrderEmailData(payload), club);
    await this.dispatch(context, 'orderPaid', {
      ...template,
      recipientEmail: payload.customer?.email ?? undefined,
      priority: 'high',
    });
  }

  async handleKitchenCompleted(context: FeatureContext, payload: OrderHookPayload): Promise<void> {
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
    const template = buildPaymentFailedMessage({
      displayNumber,
      reason: payload.reason,
    });
    await this.dispatch(context, 'paymentFailed', {
      ...template,
      priority: 'high',
    });
  }

  async handlePaymentRefunded(context: FeatureContext, payload: PaymentRefundedHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const displayNumber = payload.transactionId.slice(-8);
    const template = buildPaymentRefundedMessage({
      displayNumber,
      amount: formatPrice((payload.amountCents ?? 0) / 100),
      clubName: club.clubName,
    });
    await this.dispatch(context, 'paymentRefunded', {
      ...template,
      priority: 'normal',
    });
  }

  async handleModuleActivated(context: FeatureContext, payload: ModuleHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const moduleLabel = MODULE_LABELS[payload.moduleId] ?? payload.moduleId;
    const template = buildModuleActivatedMessage({ moduleLabel, clubName: club.clubName });
    await this.dispatch(context, 'moduleActivated', {
      ...template,
      priority: 'low',
    });
  }

  async handleModuleDeactivated(context: FeatureContext, payload: ModuleHookPayload): Promise<void> {
    const club = await loadClubContact(context);
    const moduleLabel = MODULE_LABELS[payload.moduleId] ?? payload.moduleId;
    const template = buildModuleDeactivatedMessage({ moduleLabel, clubName: club.clubName });
    await this.dispatch(context, 'moduleDeactivated', {
      ...template,
      priority: 'low',
    });
  }
}

export const notificationManager = new NotificationManager();
