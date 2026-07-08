import { Prisma, StatusCode, Order } from '@prisma/client';
import {
  orderRepository,
  customerRepository,
  foodItemRepository,
} from '../repositories';
import { eventService } from './eventService';
import { AppError } from '../middleware/errorHandler';
import {
  formatOrderNumber,
  getTodayDate,
  canTransition,
  getNextStatus,
  STATUS_LABELS,
  SOURCE_LABELS,
} from '../utils/helpers';
import { emitOrderCreated, emitOrderUpdate } from '../socket';
import { emailService } from './emailService';

type OrderWithRelations = Order & {
  customer?: { firstName: string; lastName: string; email?: string | null; phone?: string | null } | null;
  items: Array<{
    id: string;
    foodItemId: string;
    quantity: number;
    unitPrice: unknown;
    lineTotal: unknown;
    foodItem: { name: string };
  }>;
};

function mapOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    displayNumber: formatOrderNumber(order.orderNumber),
    orderDate: order.orderDate,
    source: order.source,
    sourceLabel: SOURCE_LABELS[order.source],
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    totalPrice: Number(order.totalPrice),
    createdAt: order.createdAt,
    readyAt: order.readyAt,
    pickedUpAt: order.pickedUpAt,
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
  };
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
    return mapOrder(order as OrderWithRelations);
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
    const orderDate = getTodayDate();
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
    return mapOrder(order as OrderWithRelations);
  },

  async lookupByNumber(orderNumber: number) {
    const event = await eventService.getActive();
    const orderDate = getTodayDate();
    const order = await orderRepository.findByOrderNumber(
      event.id,
      orderDate,
      orderNumber
    );
    if (!order) throw new AppError(404, 'Bestellung nicht gefunden');
    return mapOrder(order as OrderWithRelations);
  },

  async createOnlineOrder(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    items: { foodItemId: string; quantity: number }[];
  }) {
    const event = await eventService.getActive();
    if (!event.onlineOrdersActive || event.ordersClosed) {
      throw new AppError(403, 'Online-Bestellungen sind derzeit nicht möglich');
    }

    return this._createOrder(event.id, 'ONLINE', data.items, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone,
    });
  },

  async createCashierOrder(items: { foodItemId: string; quantity: number }[]) {
    const event = await eventService.getActive();
    if (!event.cashierActive || event.ordersClosed) {
      throw new AppError(403, 'Kassenbestellungen sind derzeit nicht möglich');
    }
    return this._createOrder(event.id, 'CASHIER', items);
  },

  async _createOrder(
    eventId: string,
    source: 'ONLINE' | 'CASHIER',
    items: { foodItemId: string; quantity: number }[],
    customerData?: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    }
  ) {
    const orderDate = getTodayDate();
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

    const mapped = mapOrder(order)!;
    emitOrderCreated(eventId, mapped);

    if (customerData?.email) {
      emailService.sendOrderConfirmation(customerData.email, mapped).catch(() => {});
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
    const mapped = mapOrder(updated)!;
    emitOrderUpdate(order.eventId, mapped);
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
