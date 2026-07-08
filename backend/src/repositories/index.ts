import { prisma } from '../config/database';
import { Prisma, StatusCode } from '@prisma/client';

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email }, include: { role: true } }),

  findById: (id: string) =>
    prisma.user.findUnique({ where: { id }, include: { role: true } }),

  findAll: () =>
    prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: 'desc' } }),

  create: (data: Prisma.UserCreateInput) =>
    prisma.user.create({ data, include: { role: true } }),

  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data, include: { role: true } }),
};

export const eventRepository = {
  findAll: () => prisma.event.findMany({ orderBy: [{ date: 'desc' }, { name: 'asc' }] }),

  findById: (id: string) => prisma.event.findUnique({ where: { id } }),

  findActive: () => prisma.event.findFirst({ where: { isActive: true } }),

  create: (data: Prisma.EventCreateInput) => prisma.event.create({ data }),

  update: (id: string, data: Prisma.EventUpdateInput) =>
    prisma.event.update({ where: { id }, data }),

  setActive: async (id: string) => {
    return prisma.$transaction(async (tx) => {
      await tx.event.updateMany({ where: { isActive: true }, data: { isActive: false } });
      return tx.event.update({ where: { id }, data: { isActive: true } });
    });
  },
};

export const foodItemRepository = {
  findByEvent: (eventId: string, activeOnly = false) =>
    prisma.foodItem.findMany({
      where: { eventId, ...(activeOnly ? { active: true } : {}) },
      orderBy: { sortOrder: 'asc' },
    }),

  findById: (id: string) => prisma.foodItem.findUnique({ where: { id } }),

  create: (data: Prisma.FoodItemCreateInput) => prisma.foodItem.create({ data }),

  update: (id: string, data: Prisma.FoodItemUpdateInput) =>
    prisma.foodItem.update({ where: { id }, data }),

  delete: (id: string) => prisma.foodItem.delete({ where: { id } }),
};

export const orderRepository = {
  findById: (id: string) =>
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { foodItem: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    }),

  findByEvent: (eventId: string, filters?: { status?: StatusCode[] }) =>
    prisma.order.findMany({
      where: {
        eventId,
        ...(filters?.status ? { status: { in: filters.status } } : {}),
      },
      include: {
        customer: true,
        items: { include: { foodItem: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),

  findByOrderNumber: (eventId: string, orderDate: Date, orderNumber: number) =>
    prisma.order.findUnique({
      where: {
        eventId_orderDate_orderNumber: { eventId, orderDate, orderNumber },
      },
      include: {
        customer: true,
        items: { include: { foodItem: true } },
      },
    }),

  findReadyOrders: (eventId: string) =>
    prisma.order.findMany({
      where: { eventId, status: 'READY' },
      orderBy: { readyAt: 'asc' },
    }),

  getNextOrderNumber: async (eventId: string, orderDate: Date): Promise<number> => {
    const counter = await prisma.dailyOrderCounter.upsert({
      where: { eventId_date: { eventId, date: orderDate } },
      create: { eventId, date: orderDate, counter: 1 },
      update: { counter: { increment: 1 } },
    });
    return counter.counter;
  },

  create: (data: Prisma.OrderCreateInput) =>
    prisma.order.create({
      data,
      include: {
        customer: true,
        items: { include: { foodItem: true } },
      },
    }),

  updateStatus: async (
    id: string,
    status: StatusCode,
    changedBy?: string,
    extra?: Partial<{ readyAt: Date; pickedUpAt: Date; cancelledAt: Date }>
  ) => {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status, ...extra },
        include: {
          customer: true,
          items: { include: { foodItem: true } },
        },
      });
      await tx.orderStatus.create({
        data: { orderId: id, status, changedBy },
      });
      return order;
    });
  },

  getStats: async (eventId: string) => {
    const orders = await prisma.order.findMany({
      where: { eventId, status: { not: 'CANCELLED' } },
      include: { items: { include: { foodItem: true } } },
    });

    const totalOrders = orders.length;
    const openOrders = orders.filter((o) => ['NEW', 'IN_PROGRESS'].includes(o.status)).length;
    const readyOrders = orders.filter((o) => o.status === 'READY').length;
    const pickedUpOrders = orders.filter((o) => o.status === 'PICKED_UP').length;
    const revenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);

    const foodCounts: Record<string, { name: string; count: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.foodItemId;
        if (!foodCounts[key]) {
          foodCounts[key] = { name: item.foodItem.name, count: 0 };
        }
        foodCounts[key].count += item.quantity;
      }
    }

    const popularDishes = Object.values(foodCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const completedOrders = orders.filter((o) => o.readyAt);
    let avgProcessingMinutes = 0;
    if (completedOrders.length > 0) {
      const totalMs = completedOrders.reduce(
        (sum, o) => sum + (o.readyAt!.getTime() - o.createdAt.getTime()),
        0
      );
      avgProcessingMinutes = Math.round(totalMs / completedOrders.length / 60000);
    }

    return {
      totalOrders,
      openOrders,
      readyOrders,
      pickedUpOrders,
      revenue,
      popularDishes,
      avgProcessingMinutes,
    };
  },
};

export const customerRepository = {
  create: (data: Prisma.CustomerCreateInput) => prisma.customer.create({ data }),
};
