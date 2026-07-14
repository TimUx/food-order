import { Prisma, StatusCode, Order } from '@prisma/client';
import {
  orderRepository,
  customerRepository,
  foodItemRepository,
} from '../repositories';
import { eventService } from './eventService';
import { clubService } from './clubService';
import { AppError } from '../middleware/errorHandler';
import {
  formatOrderNumber,
  getEventOrderDate,
  canTransition,
  getNextStatus,
  STATUS_LABELS,
  SOURCE_LABELS,
  formatEventDate,
  getCancellationDeadline,
  formatDateTimeDE,
  canCustomerCancelOrder,
  canStaffEditOrderItems,
  resolveCancellationDeadlineHours,
} from '../utils/helpers';
import { emitOrderCreated, emitOrderUpdate } from '../socket';
import { hookSystem } from '../platform/bootstrap';
import { CORE_HOOKS } from '../platform/types';
import { logger } from '../utils/logger';
import { getPaymentServiceRegistry, getPayableResourceRegistry } from '../core/extensionPoints';
import { paymentRepository } from '../../modules/payment/repositories/paymentRepository';
import { resolvePaymentStatus } from '../../modules/payment/types';

type OrderWithRelations = Order & {
  customer?: { firstName: string; lastName: string; email?: string | null; phone?: string | null } | null;
  event?: { date: Date; startTime: string };
  releasedToKitchen?: boolean;
  items: Array<{
    id: string;
    foodItemId: string;
    quantity: number;
    unitPrice: unknown;
    lineTotal: unknown;
    foodItem: { name: string };
  }>;
};

type CancellationInfo = {
  canCancel: boolean;
  cancellationDeadline?: string;
  cancellationDeadlineLabel?: string;
};

async function getCancellationInfo(order: OrderWithRelations): Promise<CancellationInfo> {
  if (!order.event || order.source !== 'ONLINE') {
    return { canCancel: false };
  }

  const settings = await clubService.getOrderSettings();
  const deadlineHours = resolveCancellationDeadlineHours(
    settings.cancellationDeadlineHours,
    settings.cancellationDeadlineUnit
  );
  const deadline = getCancellationDeadline(
    order.event.date,
    order.event.startTime,
    deadlineHours
  );

  return {
    canCancel: canCustomerCancelOrder(
      order.status,
      order.source,
      order.event.date,
      order.event.startTime,
      deadlineHours
    ),
    cancellationDeadline: deadline.toISOString(),
    cancellationDeadlineLabel: formatDateTimeDE(deadline),
  };
}

async function resolvePaymentAvailable(): Promise<boolean> {
  try {
    return await getPaymentServiceRegistry().isAvailable();
  } catch (err) {
    logger.warn('Payment-Verfügbarkeit konnte nicht geprüft werden', { err });
    return false;
  }
}

const PUBLIC_LOOKUP_TOKEN_REGEX = /^[a-f0-9]{64}$/;
const ORDER_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findOrderByPublicRef(ref: string) {
  if (PUBLIC_LOOKUP_TOKEN_REGEX.test(ref)) {
    return orderRepository.findByLookupToken(ref);
  }
  if (ORDER_ID_REGEX.test(ref)) {
    return orderRepository.findById(ref);
  }
  return null;
}

function paymentLabelForOrder(input: {
  orderSource: Order['source'];
  paymentRow?: { status: string; payment_status: string | null; released_to_kitchen: boolean } | null;
  releasedToKitchen?: boolean;
}): string | undefined {
  if (input.orderSource === 'CASHIER') return 'Vor Ort';
  if (!input.paymentRow) return 'Bar vor Ort';

  const status = resolvePaymentStatus(input.paymentRow as never);
  switch (status) {
    case 'PAYMENT_PAID':
    case 'ORDER_CONFIRMED':
      return 'Bezahlt';
    case 'PAYMENT_FAILED':
      return 'Zahlung fehlgeschlagen';
    case 'PAYMENT_CANCELLED':
      return 'Zahlung abgebrochen';
    case 'PAYMENT_TIMEOUT':
      return 'Zahlung abgelaufen';
    case 'PAYMENT_REFUNDED':
      return 'Rückerstattet';
    case 'PAYMENT_PROCESSING':
      return 'Zahlung wird geprüft';
    case 'PAYMENT_PENDING':
    case 'CREATED':
    default:
      return input.releasedToKitchen ? 'Freigegeben (unbezahlt)' : 'Zahlung ausstehend';
  }
}

function mapOrder(
  order: OrderWithRelations,
  cancellation?: CancellationInfo,
  extra?: { paymentLabel?: string }
) {
  return {
    id: order.id,
    lookupToken: order.lookupToken,
    eventId: order.eventId,
    orderNumber: order.orderNumber,
    displayNumber: formatOrderNumber(order.orderNumber),
    orderDate: order.orderDate,
    eventDateLabel: formatEventDate(order.orderDate),
    source: order.source,
    sourceLabel: SOURCE_LABELS[order.source],
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    paymentLabel: extra?.paymentLabel,
    releasedToKitchen: order.releasedToKitchen,
    totalPrice: Number(order.totalPrice),
    createdAt: order.createdAt,
    readyAt: order.readyAt,
    pickedUpAt: order.pickedUpAt,
    cancelledAt: order.cancelledAt,
    customer: order.customer
      ? {
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.email,
          phone: order.customer.phone,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      foodItemId: item.foodItemId,
      name: item.foodItem.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    ...(cancellation
      ? {
          canCancel: cancellation.canCancel,
          cancellationDeadline: cancellation.cancellationDeadline,
          cancellationDeadlineLabel: cancellation.cancellationDeadlineLabel,
        }
      : {}),
  };
}

async function mapOrderWithCancellation(order: OrderWithRelations) {
  const cancellation = await getCancellationInfo(order);
  let session: Awaited<ReturnType<typeof paymentRepository.findByResource>> = null;
  try {
    session = await paymentRepository.findByResource('order', order.id);
  } catch (err) {
    logger.warn('Payment-Session für Bestellung konnte nicht geladen werden', {
      orderId: order.id,
      err,
    });
  }
  const paymentLabel = paymentLabelForOrder({
    orderSource: order.source,
    paymentRow: session,
    releasedToKitchen: order.releasedToKitchen,
  });
  return mapOrder(order, cancellation, { paymentLabel });
}

function validateOrderFields(
  data: { firstName?: string; lastName?: string; email?: string; phone?: string },
  fields: {
    firstNameRequired: boolean;
    lastNameRequired: boolean;
    emailRequired: boolean;
    phoneRequired: boolean;
  }
) {
  if (fields.firstNameRequired && !data.firstName?.trim()) {
    throw new AppError(400, 'Vorname ist erforderlich');
  }
  if (fields.lastNameRequired && !data.lastName?.trim()) {
    throw new AppError(400, 'Nachname ist erforderlich');
  }
  if (fields.emailRequired && !data.email?.trim()) {
    throw new AppError(400, 'E-Mail ist erforderlich');
  }
  if (fields.phoneRequired && !data.phone?.trim()) {
    throw new AppError(400, 'Telefon ist erforderlich');
  }
}

function mergeOrderItems(items: { foodItemId: string; quantity: number }[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    if (item.quantity <= 0) continue;
    map.set(item.foodItemId, (map.get(item.foodItemId) ?? 0) + item.quantity);
  }
  const merged = [...map.entries()].map(([foodItemId, quantity]) => ({ foodItemId, quantity }));
  if (merged.length === 0) {
    throw new AppError(400, 'Mindestens ein Gericht erforderlich');
  }
  return merged;
}

async function buildOrderItems(
  eventId: string,
  items: { foodItemId: string; quantity: number }[]
) {
  const merged = mergeOrderItems(items);
  let totalPrice = new Prisma.Decimal(0);
  const orderItems: {
    foodItemId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }[] = [];

  const eventItems = await foodItemRepository.findByEvent(eventId, true);
  const eventItemMap = new Map(eventItems.map((f) => [f.id, f]));

  for (const item of merged) {
    const foodItem = eventItemMap.get(item.foodItemId);
    if (!foodItem) {
      throw new AppError(400, 'Ungültiges Gericht');
    }
    if (!foodItem.active || foodItem.soldOut) {
      throw new AppError(400, `${foodItem.name} ist nicht verfügbar`);
    }
    if (foodItem.maxQuantity && item.quantity > foodItem.maxQuantity) {
      throw new AppError(
        400,
        `Maximale Bestellmenge für ${foodItem.name}: ${foodItem.maxQuantity}`
      );
    }

    const lineTotal = new Prisma.Decimal(foodItem.price).mul(item.quantity);
    totalPrice = totalPrice.add(lineTotal);
    orderItems.push({
      foodItemId: item.foodItemId,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(foodItem.price),
      lineTotal,
    });
  }

  return { orderItems, totalPrice };
}

export const orderService = {
  mapOrder,

  async getByEvent(
    eventId: string,
    statusFilter?: StatusCode[],
    options?: { kitchenOnly?: boolean }
  ) {
    const orders = await orderRepository.findByEvent(eventId, {
      status: statusFilter,
    });
    const filtered = options?.kitchenOnly ? orders.filter((o) => (o as OrderWithRelations).releasedToKitchen) : orders;

    let sessions: Awaited<ReturnType<typeof paymentRepository.findLatestByResources>> = new Map();
    try {
      sessions = await paymentRepository.findLatestByResources(
        'order',
        filtered.map((o) => o.id)
      );
    } catch (err) {
      logger.warn('Payment-Sessions für Bestellliste konnten nicht geladen werden', {
        eventId,
        err,
      });
    }

    return filtered.map((o) => {
      const session = sessions.get(o.id) ?? null;
      const paymentLabel = paymentLabelForOrder({
        orderSource: o.source,
        paymentRow: session,
        releasedToKitchen: (o as OrderWithRelations).releasedToKitchen,
      });
      return mapOrder(o as OrderWithRelations, undefined, { paymentLabel });
    });
  },

  async getByLookupToken(token: string, lastName?: string) {
    const order = await findOrderByPublicRef(token);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');

    if (!lastName?.trim()) {
      throw new AppError(400, 'Bitte geben Sie Ihren Nachnamen ein');
    }
    if (
      !order.customer ||
      order.customer.lastName.toLowerCase() !== lastName.trim().toLowerCase()
    ) {
      throw new AppError(404, 'Bestellung nicht gefunden');
    }

    return mapOrderWithCancellation(order as OrderWithRelations);
  },

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');
    return mapOrderWithCancellation(order as OrderWithRelations);
  },

  async getReadyOrders(eventId: string) {
    const orders = await orderRepository.findReadyOrders(eventId);
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      displayNumber: formatOrderNumber(o.orderNumber),
      readyAt: o.readyAt,
    }));
  },

  async lookupByNumberAndName(eventId: string, orderNumber: number, lastName?: string) {
    const event = await eventService.getStaffPickupEvent(eventId);
    const orderDate = getEventOrderDate(event.date);
    const order = await orderRepository.findByOrderNumber(
      event.id,
      orderDate,
      orderNumber
    );
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');

    const nameQuery = lastName?.trim() ?? '';
    const requiresName = order.source === 'ONLINE' && Boolean(order.customer);
    if (requiresName && !nameQuery) {
      throw new AppError(400, 'Nachname erforderlich');
    }
    if (nameQuery && order.customer) {
      if (order.customer.lastName.toLowerCase() !== nameQuery.toLowerCase()) {
        throw new AppError(404, 'Bestellung nicht gefunden');
      }
    } else if (nameQuery && !order.customer) {
      throw new AppError(404, 'Bestellung nicht gefunden');
    }

    return mapOrderWithCancellation(order as OrderWithRelations);
  },

  async lookupByNumber(eventId: string, orderNumber: number, lastName?: string) {
    return this.lookupByNumberAndName(eventId, orderNumber, lastName);
  },

  async createOnlineOrder(data: {
    eventId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    items: { foodItemId: string; quantity: number }[];
    paymentMethodId?: string;
  }) {
    const event = await eventService.getOrderableById(data.eventId, 'online');

    const orderSettings = await clubService.getOrderSettings();
    const customerData = {
      firstName: data.firstName?.trim() || '',
      lastName: data.lastName?.trim() || '',
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
    };

    validateOrderFields(customerData, orderSettings.fields);

    const paymentAvailable = await resolvePaymentAvailable();
    const payOnline = Boolean(paymentAvailable && data.paymentMethodId);

    const mapped = await this._createOrder(event, 'ONLINE', data.items, customerData, {
      // Online-Bestellungen werden erst nach expliziter Freigabe an die Küche übergeben
      // (oder automatisch nach erfolgreicher Online-Zahlung).
      skipKitchenNotify: true,
    });

    if (payOnline && data.paymentMethodId) {
      const { config } = await import('../config');
      try {
        const resource = await getPayableResourceRegistry().toPayableResource(
          'order',
          mapped.id,
          config.corsOrigin
        );
        if (resource) {
          const checkout = await getPaymentServiceRegistry().createCheckout(resource, data.paymentMethodId);
          if (checkout) {
            return {
              ...mapped,
              payment: {
                required: true,
                checkoutUrl: checkout.checkoutUrl,
                sessionId: checkout.sessionId,
                paymentStatus: checkout.paymentStatus,
                expiresAt: checkout.expiresAt,
              },
            };
          }
        }
      } catch (err) {
        logger.warn('Online-Zahlung konnte nach Bestellung nicht gestartet werden', {
          orderId: mapped.id,
          err,
        });
      }
      // Falls Checkout nicht erstellt werden konnte, bleibt die Bestellung gespeichert und ist im Mitarbeiterbereich sichtbar.
    }

    return mapped;
  },

  async createOrderCheckout(orderId: string, paymentMethodId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');
    if (order.source !== 'ONLINE') throw new AppError(400, 'Nur für Online-Bestellungen');

    const paymentAvailable = await getPaymentServiceRegistry().isAvailable();
    if (!paymentAvailable) throw new AppError(400, 'Onlinezahlung nicht verfügbar');

    const released = await getPaymentServiceRegistry().isResourceReleased('order', orderId);
    if (released) throw new AppError(400, 'Bestellung ist bereits freigegeben');

    const { config } = await import('../config');
    const resource = await getPayableResourceRegistry().toPayableResource('order', orderId, config.corsOrigin);
    if (!resource) throw new AppError(404, 'Bestellung nicht gefunden');

    const checkout = await getPaymentServiceRegistry().createCheckout(resource, paymentMethodId);
    if (!checkout) throw new AppError(400, 'Zahlung konnte nicht gestartet werden');

    return {
      required: true,
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      paymentStatus: checkout.paymentStatus,
      expiresAt: checkout.expiresAt,
    };
  },

  async _releaseOrderToKitchen(
    event: { id: string; date: Date; startTime: string },
    mapped: Awaited<ReturnType<typeof mapOrderWithCancellation>>,
    _customerData?: { email?: string }
  ) {
    emitOrderCreated(event.id, mapped);
    hookSystem.emitAsync(CORE_HOOKS.ORDER_CREATED, mapped);
  },

  async createCashierOrder(
    eventId: string,
    items: { foodItemId: string; quantity: number }[],
    paymentMethodId?: string
  ) {
    const event = await eventService.getOrderableById(eventId, 'cashier');

    const paymentAvailable = await resolvePaymentAvailable();
    const payOnline = Boolean(paymentAvailable && paymentMethodId);

    const mapped = await this._createOrder(event, 'CASHIER', items, undefined, {
      // Vor-Ort Bestellungen sind sofort für die Küche freigegeben – unabhängig vom Zahlstatus.
      skipKitchenNotify: false,
    });

    if (payOnline && paymentMethodId) {
      const { config } = await import('../config');
      try {
        const resource = await getPayableResourceRegistry().toPayableResource(
          'order',
          mapped.id,
          config.corsOrigin
        );
        if (resource) {
          const checkout = await getPaymentServiceRegistry().createCheckout(resource, paymentMethodId);
          if (checkout) {
            return {
              ...mapped,
              payment: {
                required: true,
                checkoutUrl: checkout.checkoutUrl,
                sessionId: checkout.sessionId,
                paymentStatus: checkout.paymentStatus,
                expiresAt: checkout.expiresAt,
              },
            };
          }
        }
      } catch (err) {
        logger.warn('Online-Zahlung an der Kasse konnte nicht gestartet werden', {
          orderId: mapped.id,
          err,
        });
      }
      await orderService._releaseOrderToKitchen(event, mapped);
    }

    return mapped;
  },

  async releaseToKitchen(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');

    // Markiere Bestellung als freigegeben.
    await orderRepository.setReleasedToKitchen(orderId, true);

    // Falls es eine Payment-Session gibt, ebenfalls auf "freigegeben" setzen (damit pending Sessions nicht mehr blockieren).
    const session = await paymentRepository.findByResource('order', orderId);
    if (session && !session.released_to_kitchen) {
      try {
        await paymentRepository.updatePayment(session.id, { releasedToKitchen: true });
      } catch (err) {
        logger.warn('Payment-Session konnte bei Küchenfreigabe nicht aktualisiert werden', {
          orderId,
          sessionId: session.id,
          err,
        });
      }
    }

    const full = await orderRepository.findById(orderId);
    if (!full) throw new AppError(404, 'Bestellung nicht gefunden');
    const mapped = await mapOrderWithCancellation(full as OrderWithRelations);
    emitOrderCreated(full.eventId, mapped);
    hookSystem.emitAsync(CORE_HOOKS.ORDER_CREATED, mapped);
    return mapped;
  },

  async abortCashierOrderPayment(orderId: string, sessionId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');
    if (order.source !== 'CASHIER') throw new AppError(400, 'Nur für Kassenbestellungen');

    try {
      await getPaymentServiceRegistry().cancelCheckout(sessionId);
    } catch {
      /* Session ggf. bereits abgelaufen */
    }

    return this.updateStatus(orderId, 'CANCELLED');
  },

  async cancelOnlineOrder(lookupToken: string, lastName: string) {
    const order = await findOrderByPublicRef(lookupToken);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');

    if (order.source !== 'ONLINE') {
      throw new AppError(400, 'Diese Bestellung kann nicht online storniert werden');
    }

    if (
      !order.customer ||
      order.customer.lastName.toLowerCase() !== lastName.toLowerCase()
    ) {
      throw new AppError(403, 'Stornierung nicht möglich – Nachname stimmt nicht überein');
    }

    const settings = await clubService.getOrderSettings();
    const deadlineHours = resolveCancellationDeadlineHours(
      settings.cancellationDeadlineHours,
      settings.cancellationDeadlineUnit
    );
    if (
      !canCustomerCancelOrder(
        order.status,
        order.source,
        order.event.date,
        order.event.startTime,
        deadlineHours
      )
    ) {
      throw new AppError(400, 'Stornierung nicht mehr möglich – Frist abgelaufen oder Bestellung bereits bearbeitet');
    }

    return this.updateStatus(order.id, 'CANCELLED');
  },

  async _createOrder(
    event: { id: string; date: Date; startTime: string },
    source: 'ONLINE' | 'CASHIER',
    items: { foodItemId: string; quantity: number }[],
    customerData?: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    },
    options?: { skipKitchenNotify?: boolean }
  ) {
    const eventId = event.id;
    const orderDate = getEventOrderDate(event.date);
    const { orderItems, totalPrice } = await buildOrderItems(eventId, items);

    const orderNumber = await orderRepository.getNextOrderNumber(eventId, orderDate);

    let customerId: string | undefined;
    if (customerData) {
      const customer = await customerRepository.create(customerData);
      customerId = customer.id;
    }

    const order = await orderRepository.create({
      eventId,
      ...(customerId ? { customerId } : {}),
      orderNumber,
      orderDate,
      source,
      releasedToKitchen: source === 'CASHIER',
      status: 'NEW',
      totalPrice,
      items: {
        create: orderItems,
      },
      statusHistory: {
        create: { status: 'NEW' },
      },
    });

    const orderWithEvent = { ...order, event: { date: event.date, startTime: event.startTime } };
    const mapped = await mapOrderWithCancellation(orderWithEvent as OrderWithRelations);

    if (!options?.skipKitchenNotify) {
      await orderService._releaseOrderToKitchen(event, mapped, customerData);
    }

    return mapped;
  },

  async updateItems(
    id: string,
    items: { foodItemId: string; quantity: number }[],
    _changedBy?: string
  ) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');

    if (!canStaffEditOrderItems(order.status)) {
      throw new AppError(400, 'Bestellung kann in diesem Status nicht mehr bearbeitet werden');
    }

    const { orderItems, totalPrice } = await buildOrderItems(order.eventId, items);
    const updated = await orderRepository.replaceItems(id, orderItems, totalPrice);
    const mapped = await mapOrderWithCancellation(updated as OrderWithRelations);
    emitOrderUpdate(order.eventId, mapped);
    hookSystem.emitAsync(CORE_HOOKS.ORDER_STATUS_CHANGED, mapped);
    return mapped;
  },

  async updateStatus(id: string, status: StatusCode, changedBy?: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');

    if (!canTransition(order.status, status)) {
      throw new AppError(
        400,
        `Statuswechsel von ${STATUS_LABELS[order.status]} zu ${STATUS_LABELS[status]} nicht erlaubt`
      );
    }

    const extra: Partial<{ readyAt: Date; pickedUpAt: Date; cancelledAt: Date }> = {};
    if (status === 'READY') extra.readyAt = new Date();
    if (status === 'PICKED_UP') extra.pickedUpAt = new Date();
    if (status === 'CANCELLED') extra.cancelledAt = new Date();

    const updated = await orderRepository.updateStatus(id, status, changedBy, extra);
    const mapped = await mapOrderWithCancellation(updated as OrderWithRelations);
    emitOrderUpdate(order.eventId, mapped);
    hookSystem.emitAsync(CORE_HOOKS.ORDER_STATUS_CHANGED, mapped);

    if (status === 'CANCELLED') {
      const cancelledAt = extra.cancelledAt || new Date();
      hookSystem.emitAsync(CORE_HOOKS.ORDER_CANCELLED, {
        ...mapped,
        source: order.source,
        initiatedByStaff: Boolean(changedBy),
        cancelledAtLabel: formatDateTimeDE(cancelledAt),
      });
    }
    if (status === 'READY') {
      hookSystem.emitAsync(CORE_HOOKS.KITCHEN_COMPLETED, mapped);
    }

    return mapped;
  },

  async advanceStatus(id: string, changedBy?: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');
    const next = getNextStatus(order.status);
    if (!next) throw new AppError(400, 'Kein weiterer Status verfügbar');
    return this.updateStatus(id, next, changedBy);
  },

  async getStats(eventId: string) {
    const { buildOrderEventStats } = await import('../repositories/orderStats');
    const orders = await orderRepository.findByEvent(eventId);
    const visible = orders.filter((o) => o.status !== 'CANCELLED');

    const statusCounts: Partial<Record<StatusCode, number>> = {};
    for (const order of visible) {
      statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    }

    const revenue = visible.reduce((sum, order) => sum + Number(order.totalPrice), 0);

    const itemCounts = new Map<string, { name: string; count: number }>();
    for (const order of visible) {
      for (const item of order.items) {
        const existing = itemCounts.get(item.foodItemId);
        if (existing) {
          existing.count += item.quantity;
        } else {
          itemCounts.set(item.foodItemId, {
            name: item.foodItem.name,
            count: item.quantity,
          });
        }
      }
    }
    const popularDishes = [...itemCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const readyOrders = visible.filter((o) => o.readyAt);
    const avgProcessingMinutes =
      readyOrders.length > 0
        ? Math.round(
            readyOrders.reduce(
              (sum, o) => sum + (o.readyAt!.getTime() - o.createdAt.getTime()) / 60_000,
              0
            ) / readyOrders.length
          )
        : 0;

    return buildOrderEventStats({
      statusCounts,
      revenue,
      popularDishes,
      avgProcessingMinutes,
    });
  },
};
