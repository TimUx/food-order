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
} from '../utils/helpers';
import { emitOrderCreated, emitOrderUpdate } from '../socket';
import { emailService } from './emailService';

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

  const settings = await clubService.getSettings();
  const deadline = getCancellationDeadline(
    order.event.date,
    order.event.startTime,
    settings.cancellationDeadlineHours
  );

  return {
    canCancel: canCustomerCancelOrder(
      order.status,
      order.source,
      order.event.date,
      order.event.startTime,
      settings.cancellationDeadlineHours
    ),
    cancellationDeadline: deadline.toISOString(),
    cancellationDeadlineLabel: formatDateTimeDE(deadline),
  };
}

function mapOrder(order: OrderWithRelations, cancellation?: CancellationInfo) {
  return {
    id: order.id,
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

export const orderService = {
  mapOrder,

  async getByEvent(eventId: string, statusFilter?: StatusCode[]) {
    const orders = await orderRepository.findByEvent(eventId, {
      status: statusFilter,
    });
    return orders.map((o) => mapOrder(o as OrderWithRelations));
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

  async lookupByNumber(orderNumber: number) {
    const event = await eventService.getActive();
    const orderDate = getEventOrderDate(event.date);
    const order = await orderRepository.findByOrderNumber(
      event.id,
      orderDate,
      orderNumber
    );
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');
    return mapOrder(order as OrderWithRelations);
  },

  async createOnlineOrder(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    items: { foodItemId: string; quantity: number }[];
  }) {
    const event = await eventService.getActive();
    if (!event.onlineOrdersActive || event.ordersClosed) {
      throw new AppError(403, 'Online-Bestellungen sind derzeit nicht möglich');
    }

    const orderSettings = await clubService.getOrderSettings();
    const customerData = {
      firstName: data.firstName?.trim() || '',
      lastName: data.lastName?.trim() || '',
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
    };

    validateOrderFields(customerData, orderSettings.fields);

    return this._createOrder(event, 'ONLINE', data.items, customerData);
  },

  async createCashierOrder(items: { foodItemId: string; quantity: number }[]) {
    const event = await eventService.getActive();
    if (!event.cashierActive || event.ordersClosed) {
      throw new AppError(403, 'Kassenbestellungen sind derzeit nicht möglich');
    }
    return this._createOrder(event, 'CASHIER', items);
  },

  async cancelOnlineOrder(id: string, lastName: string) {
    const order = await orderRepository.findById(id);
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

    const settings = await clubService.getSettings();
    if (
      !canCustomerCancelOrder(
        order.status,
        order.source,
        order.event.date,
        order.event.startTime,
        settings.cancellationDeadlineHours
      )
    ) {
      throw new AppError(400, 'Stornierung nicht mehr möglich – Frist abgelaufen oder Bestellung bereits bearbeitet');
    }

    return this.updateStatus(id, 'CANCELLED');
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
    }
  ) {
    const eventId = event.id;
    const orderDate = getEventOrderDate(event.date);
    let totalPrice = new Prisma.Decimal(0);
    const orderItems: {
      foodItemId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }[] = [];

    for (const item of items) {
      const foodItem = await foodItemRepository.findById(item.foodItemId);
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

    const orderNumber = await orderRepository.getNextOrderNumber(eventId, orderDate);

    let customerId: string | undefined;
    if (customerData) {
      const customer = await customerRepository.create(customerData);
      customerId = customer.id;
    }

    const order = await orderRepository.create({
      event: { connect: { id: eventId } },
      ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
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
    emitOrderCreated(eventId, mapped);

    if (customerData?.email) {
      const club = await clubService.getPublic();
      const settings = await clubService.getSettings();
      const deadline = getCancellationDeadline(
        event.date,
        event.startTime,
        settings.cancellationDeadlineHours
      );

      emailService
        .sendOrderConfirmation(
          customerData.email,
          {
            id: mapped.id,
            displayNumber: mapped.displayNumber,
            totalPrice: mapped.totalPrice,
            eventDateLabel: mapped.eventDateLabel,
            items: mapped.items.map((i) => ({
              name: i.name!,
              quantity: i.quantity,
              lineTotal: i.lineTotal!,
            })),
            cancellationDeadlineLabel: formatDateTimeDE(deadline),
          },
          {
            clubName: club.clubName,
            contactName: club.contactName,
            email: club.email,
            phone: club.phone,
            address: club.address,
          }
        )
        .catch(() => {});
    }

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

    if (status === 'CANCELLED' && order.source === 'ONLINE' && order.customer?.email) {
      const club = await clubService.getPublic();
      const cancelledAt = extra.cancelledAt || new Date();
      emailService
        .sendOrderCancellation(
          order.customer.email,
          {
            id: mapped.id,
            displayNumber: mapped.displayNumber,
            totalPrice: mapped.totalPrice,
            eventDateLabel: mapped.eventDateLabel,
            items: mapped.items.map((i) => ({
              name: i.name!,
              quantity: i.quantity,
              lineTotal: i.lineTotal!,
            })),
            cancelledAtLabel: formatDateTimeDE(cancelledAt),
          },
          {
            clubName: club.clubName,
            contactName: club.contactName,
            email: club.email,
            phone: club.phone,
            address: club.address,
          },
          { initiatedByStaff: Boolean(changedBy) }
        )
        .catch(() => {});
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
