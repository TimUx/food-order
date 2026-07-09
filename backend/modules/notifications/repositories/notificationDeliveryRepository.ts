import { prisma } from '../../../src/config/database';
import { v4 as uuidv4 } from 'uuid';
import { requireTenantId } from '../../../src/platform/tenant/tenantScope';
import type { NotificationChannelId, NotificationEventType } from '../config';

export const notificationDeliveryRepository = {
  async log(data: {
    eventType: NotificationEventType;
    channelId: NotificationChannelId;
    recipient?: string;
    status: 'sent' | 'failed';
    errorMessage?: string;
    smtpSource?: string;
  }): Promise<void> {
    const tenantId = requireTenantId();
    await prisma.$executeRaw`
      INSERT INTO notification_deliveries (
        id, tenant_id, event_type, channel_id, recipient, status, error_message, smtp_source, created_at
      ) VALUES (
        ${uuidv4()}::uuid,
        ${tenantId},
        ${data.eventType},
        ${data.channelId},
        ${data.recipient ?? null},
        ${data.status},
        ${data.errorMessage ?? null},
        ${data.smtpSource ?? null},
        NOW()
      )
    `.catch(() => {
      // Tabelle evtl. noch nicht migriert – Versand nicht blockieren
    });
  },

  async findRecent(limit = 50) {
    const tenantId = requireTenantId();
    return prisma.$queryRaw<
      Array<{
        id: string;
        event_type: string;
        channel_id: string;
        recipient: string | null;
        status: string;
        error_message: string | null;
        created_at: Date;
      }>
    >`
      SELECT id, event_type, channel_id, recipient, status, error_message, created_at
      FROM notification_deliveries
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `.catch(() => []);
  },
};
