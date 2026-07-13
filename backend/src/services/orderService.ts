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
import { getPaymentServiceRegistry, getPayableResourceRegistry } from '../core/extensionPoints';

type OrderWithRelations = Order & {
  customer?: { firstName: string; lastName: string; email?: string | null; phone?: string | null } | null;
  event?: { date: Date; startTime: string };
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

function mapOrder(order: OrderWithRelations, cancellation?: CancellationInfo) {
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
  return mapOrder(order, cancellation);
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

  const foodItemIds = merged.map((i) => i.foodItemId);
  const foodItems = await foodItemRepository.findByIds(foodItemIds);
  const foodItemMap = new Map(foodItems.map((f) => [f.id, f]));

  for (const item of merged) {
    const foodItem = foodItemMap.get(item.foodItemId);
    if (!foodItem || foodItem.eventId !== eventId) {
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

  async getByEvent(eventId: string, statusFilter?: StatusCode[]) {
    const orders = await orderRepository.findByEvent(eventId, {
      status: statusFilter,
    });
    const ids = orders.map((o) => o.id);
    const releasedIds = new Set(await getPaymentServiceRegistry().filterReleasedIds('order', ids));
    const filtered = orders.filter((o) => releasedIds.has(o.id));
    return filtered.map((o) => mapOrder(o as OrderWithRelations));
  },

  async getByLookupToken(token: string, lastName?: string) {
    const order = await orderRepository.findByLookupToken(token);
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

    const releasedIds = await getPaymentServiceRegistry().filterReleasedIds('order', [order.id]);
    if (!releasedIds.includes(order.id)) {
      throw new AppError(404, 'Bestellung nicht gefunden');
    }
    return mapOrderWithCancellation(order as OrderWithRelations);
  },

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');
    const releasedIds = await getPaymentServiceRegistry().filterReleasedIds('order', [id]);
    if (!releasedIds.includes(id)) {
      throw new AppError(404, 'Bestellung nicht gefunden');
    }
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

  async lookupByNumberAndName(orderNumber: number, lastName: string) {
    const event = await eventService.getActive();
    const orderDate = getEventOrderDate(event.date);
    const order = await orderRepository.findByOrderNumber(
      event.id,
      orderDate,
      orderNumber
    );
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');
    if (
      !order.customer ||
      order.customer.lastName.toLowerCase() !== lastName.toLowerCase()
    ) {
      throw new AppError(404, 'Bestellung nicht gefunden');
    }
    return mapOrderWithCancellation(order as OrderWithRelations);
  },

  async lookupByNumber(orderNumber: number, lastName: string) {
    return this.lookupByNumberAndName(orderNumber, lastName);
  },

  async createOnlineOrder(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    items: { foodItemId: string; quantity: number }[];
    paymentMethodId?: string;
  }) {
    const event = await eventService.getActive();
    if (!event.onlineOrdersActive || event.ordersClosed) {
      throw new AppError(403, 'Online-Bestellung ist geschlossen. Bitte bestellen Sie an der Theke.');
    }

    const orderSettings = await clubService.getOrderSettings();
    const customerData = {
      firstName: data.firstName?.trim() || '',
      lastName: data.lastName?.trim() || '',
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
    };

    validateOrderFields(customerData, orderSettings.fields);

    const paymentAvailable = await getPaymentServiceRegistry().isAvailable();
    const payOnline = Boolean(paymentAvailable && data.paymentMethodId);

    const mapped = await this._createOrder(event, 'ONLINE', data.items, customerData, {
      skipKitchenNotify: payOnline,
    });

    if (payOnline && data.paymentMethodId) {
      const { config } = await import('../config');
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
      await orderService._releaseOrderToKitchen(event, mapped, customerData);
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
    items: { foodItemId: string; quantity: number }[],
    paymentMethodId?: string
  ) {
    const event = await eventService.getActive();
    if (!event.cashierActive || event.ordersClosed) {
      throw new AppError(403, 'Kassenbestellung ist geschlossen. Bitte wenden Sie sich an das Personal.');
    }

    const paymentAvailable = await getPaymentServiceRegistry().isAvailable();
    const payOnline = Boolean(paymentAvailable && paymentMethodId);

    const mapped = await this._createOrder(event, 'CASHIER', items, undefined, {
      skipKitchenNotify: payOnline,
    });

    if (payOnline && paymentMethodId) {
      const { config } = await import('../config');
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
      await orderService._releaseOrderToKitchen(event, mapped);
    }

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
    const order = await orderRepository.findByLookupToken(lookupToken);
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
    return orderRepository.getStats(eventId);
  },
};
