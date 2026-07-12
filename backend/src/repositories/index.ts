import { prisma } from '../config/database';
import { Prisma, RoleName, StatusCode } from '@prisma/client';
import crypto from 'crypto';
import { requireTenantId, tenantWhere } from '../platform/tenant/tenantScope';
import { parseLoginIdentifier } from '../services/loginIdentifier';

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findFirst({
      where: tenantWhere({ email: email.toLowerCase().trim() }),
      include: { role: true },
    }),

  findByUsername: (username: string) =>
    prisma.user.findFirst({
      where: tenantWhere({ username: username.toLowerCase().trim() }),
      include: { role: true },
    }),

  findByLoginIdentifier: (identifier: string) => {
    const parsed = parseLoginIdentifier(identifier);
    if (parsed.type === 'email') {
      return userRepository.findByEmail(parsed.value);
    }
    return userRepository.findByUsername(parsed.value);
  },

  findById: (id: string) =>
    prisma.user.findFirst({
      where: tenantWhere({ id }),
      include: { role: true },
    }),

  findForTenant: () =>
    prisma.user.findMany({
      where: tenantWhere(),
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    }),

  create: (data: Prisma.UserUncheckedCreateWithoutTenantInput) =>
    prisma.user.create({
      data: {
        ...data,
        tenantId: requireTenantId(),
      },
      include: { role: true },
    }),

  update: async (id: string, data: Prisma.UserUpdateInput) => {
    const result = await prisma.user.updateMany({
      where: tenantWhere({ id }),
      data,
    });
    if (result.count === 0) {
      throw new Error('Benutzer nicht gefunden');
    }
    const user = await userRepository.findById(id);
    if (!user) throw new Error('Benutzer nicht gefunden');
    return user;
  },

  countActiveAdmins: () =>
    prisma.user.count({
      where: tenantWhere({ active: true, role: { name: RoleName.ADMIN } }),
    }),
};

export const eventRepository = {
  findForTenant: () =>
    prisma.event.findMany({
      where: tenantWhere(),
      orderBy: [{ date: 'desc' }, { name: 'asc' }],
    }),

  findById: (id: string) =>
    prisma.event.findFirst({ where: tenantWhere({ id }) }),

  findActive: () =>
    prisma.event.findFirst({ where: tenantWhere({ isActive: true }) }),

  create: (data: Prisma.EventUncheckedCreateWithoutTenantInput) =>
    prisma.event.create({
      data: {
        ...data,
        tenantId: requireTenantId(),
      },
    }),

  update: async (id: string, data: Prisma.EventUpdateInput) => {
    const result = await prisma.event.updateMany({
      where: tenantWhere({ id }),
      data,
    });
    if (result.count === 0) throw new Error('Veranstaltung nicht gefunden');
    const event = await eventRepository.findById(id);
    if (!event) throw new Error('Veranstaltung nicht gefunden');
    return event;
  },

  setActive: async (id: string) => {
    const tenantId = requireTenantId();
    return prisma.$transaction(async (tx) => {
      await tx.event.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false },
      });
      await tx.event.updateMany({
        where: { tenantId, id },
        data: { isActive: true },
      });
      return tx.event.findFirst({ where: { tenantId, id } });
    });
  },
};

export const foodItemRepository = {
  findByEvent: (eventId: string, activeOnly = false) =>
    prisma.foodItem.findMany({
      where: tenantWhere({
        eventId,
        ...(activeOnly ? { active: true } : {}),
      }),
      orderBy: { sortOrder: 'asc' },
    }),

  findById: (id: string) =>
    prisma.foodItem.findFirst({ where: tenantWhere({ id }) }),

  findByIds: (ids: string[]) => {
    if (ids.length === 0) return Promise.resolve([]);
    return prisma.foodItem.findMany({
      where: tenantWhere({ id: { in: ids } }),
    });
  },

  create: (data: Prisma.FoodItemUncheckedCreateWithoutTenantInput) =>
    prisma.foodItem.create({
      data: {
        ...data,
        tenantId: requireTenantId(),
      },
    }),

  update: async (id: string, data: Prisma.FoodItemUpdateInput) => {
    const result = await prisma.foodItem.updateMany({
      where: tenantWhere({ id }),
      data,
    });
    if (result.count === 0) throw new Error('Speise nicht gefunden');
    const item = await foodItemRepository.findById(id);
    if (!item) throw new Error('Speise nicht gefunden');
    return item;
  },

  delete: (id: string) =>
    prisma.foodItem.deleteMany({ where: tenantWhere({ id }) }),
};

export const orderRepository = {
  findById: (id: string) =>
    prisma.order.findFirst({
      where: tenantWhere({ id }),
      include: {
        customer: true,
        event: true,
        items: { include: { foodItem: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    }),

  findByLookupToken: (lookupToken: string) =>
    prisma.order.findFirst({
      where: tenantWhere({ lookupToken }),
      include: {
        customer: true,
        event: true,
        items: { include: { foodItem: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    }),

  findByEvent: (eventId: string, filters?: { status?: StatusCode[] }) =>
    prisma.order.findMany({
      where: tenantWhere({
        eventId,
        ...(filters?.status ? { status: { in: filters.status } } : {}),
      }),
      include: {
        customer: true,
        items: { include: { foodItem: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),

  findByOrderNumber: (eventId: string, orderDate: Date, orderNumber: number) =>
    prisma.order.findFirst({
      where: tenantWhere({ eventId, orderDate, orderNumber }),
      include: {
        customer: true,
        event: true,
        items: { include: { foodItem: true } },
      },
    }),

  findReadyOrders: (eventId: string) =>
    prisma.order.findMany({
      where: tenantWhere({ eventId, status: StatusCode.READY }),
      orderBy: { readyAt: 'asc' },
    }),

  getNextOrderNumber: async (eventId: string, orderDate: Date): Promise<number> => {
    const tenantId = requireTenantId();
    const counter = await prisma.dailyOrderCounter.upsert({
      where: { eventId_date: { eventId, date: orderDate } },
      create: { tenantId, eventId, date: orderDate, counter: 1 },
      update: { counter: { increment: 1 } },
    });
    return counter.counter;
  },

  create: (
    data: Omit<Prisma.OrderUncheckedCreateWithoutTenantInput, 'lookupToken' | 'tenantId'> & {
      lookupToken?: string;
    }
  ) =>
    prisma.order.create({
      data: {
        ...data,
        tenantId: requireTenantId(),
        lookupToken: data.lookupToken ?? crypto.randomBytes(32).toString('hex'),
      },
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
    const tenantId = requireTenantId();
    return prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({ where: { tenantId, id } });
      if (!existing) throw new Error('Bestellung nicht gefunden');

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
    const { getOrderEventStats } = await import('./orderStats');
    return getOrderEventStats(eventId);
  },

  replaceItems: async (
    id: string,
    items: Array<{
      foodItemId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>,
    totalPrice: Prisma.Decimal
  ) => {
    const tenantId = requireTenantId();
    return prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({ where: { tenantId, id } });
      if (!existing) throw new Error('Bestellung nicht gefunden');

      await tx.orderItem.deleteMany({ where: { orderId: id } });
      if (items.length > 0) {
        await tx.orderItem.createMany({
          data: items.map((item) => ({
            orderId: id,
            foodItemId: item.foodItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        });
      }

      return tx.order.update({
        where: { id },
        data: { totalPrice },
        include: {
          customer: true,
          event: true,
          items: { include: { foodItem: true } },
        },
      });
    });
  },
};

export const customerRepository = {
  create: (data: Prisma.CustomerUncheckedCreateWithoutTenantInput) =>
    prisma.customer.create({
      data: {
        ...data,
        tenantId: requireTenantId(),
      },
    }),
};
