import { prisma } from '../config/database';
import { Prisma, RoleName, StatusCode } from '@prisma/client';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';
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
    const existing = await userRepository.findById(id);
    if (!existing) {
      throw new AppError(404, 'Benutzer nicht gefunden');
    }
    return prisma.user.update({
      where: { id: existing.id },
      data,
      include: { role: true },
    });
  },

  countActiveAdmins: () =>
    prisma.user.count({
      where: tenantWhere({ active: true, role: { name: RoleName.ADMIN } }),
    }),

  findAdminNotificationSubscribers: () =>
    prisma.user.findMany({
      where: tenantWhere({
        active: true,
        notificationEmailsEnabled: true,
        email: { not: null },
        role: { name: RoleName.ADMIN },
      }),
      select: { email: true },
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

  findActiveEvents: () =>
    prisma.event.findMany({
      where: tenantWhere({ isActive: true }),
      orderBy: [{ date: 'asc' }, { name: 'asc' }],
    }),

  findOnlineOrderableEvents: () =>
    prisma.event.findMany({
      where: tenantWhere({
        isActive: true,
        onlineOrdersActive: true,
        ordersClosed: false,
      }),
      orderBy: [{ date: 'asc' }, { name: 'asc' }],
    }),

  findCashierOrderableEvents: () =>
    prisma.event.findMany({
      where: tenantWhere({
        isActive: true,
        cashierActive: true,
        ordersClosed: false,
      }),
      orderBy: [{ date: 'asc' }, { name: 'asc' }],
    }),

  findPickupEvents: () =>
    prisma.event.findMany({
      where: tenantWhere({
        isActive: true,
        ordersClosed: false,
      }),
      orderBy: [{ date: 'asc' }, { name: 'asc' }],
    }),

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

  setIsActive: async (id: string, isActive: boolean) =>
    eventRepository.update(id, { isActive }),

  countOrders: (eventId: string) =>
    prisma.order.count({
      where: tenantWhere({ eventId }),
    }),

  delete: async (id: string) => {
    const result = await prisma.event.deleteMany({ where: tenantWhere({ id }) });
    if (result.count === 0) throw new Error('Veranstaltung nicht gefunden');
  },
};

export const foodItemRepository = {
  mapForEvent(
    assignment: {
      eventId: string;
      sortOrder: number;
      soldOut: boolean;
      foodItem: {
        id: string;
        name: string;
        description: string | null;
        price: Prisma.Decimal;
        imageUrl: string | null;
        sortOrder: number;
        active: boolean;
        maxQuantity: number | null;
      };
    }
  ) {
    return {
      id: assignment.foodItem.id,
      eventId: assignment.eventId,
      name: assignment.foodItem.name,
      description: assignment.foodItem.description,
      price: Number(assignment.foodItem.price),
      imageUrl: assignment.foodItem.imageUrl,
      sortOrder: assignment.sortOrder,
      active: assignment.foodItem.active,
      soldOut: assignment.soldOut,
      maxQuantity: assignment.foodItem.maxQuantity,
    };
  },

  findCatalog: (activeOnly = false) =>
    prisma.foodItem.findMany({
      where: tenantWhere(activeOnly ? { active: true } : {}),
      orderBy: { sortOrder: 'asc' },
    }),

  findByEvent: async (eventId: string, activeOnly = false) => {
    const assignments = await prisma.eventFoodItem.findMany({
      where: tenantWhere({ eventId }),
      include: { foodItem: true },
      orderBy: { sortOrder: 'asc' },
    });
    return assignments
      .filter((assignment) => !activeOnly || assignment.foodItem.active)
      .map((assignment) => foodItemRepository.mapForEvent(assignment));
  },

  findAssignmentsByEvent: (eventId: string) =>
    prisma.eventFoodItem.findMany({
      where: tenantWhere({ eventId }),
      include: { foodItem: true },
      orderBy: { sortOrder: 'asc' },
    }),

  findAssignment: (eventId: string, foodItemId: string) =>
    prisma.eventFoodItem.findFirst({
      where: tenantWhere({ eventId, foodItemId }),
      include: { foodItem: true },
    }),

  setEventAssignments: async (eventId: string, foodItemIds: string[]) => {
    const tenantId = requireTenantId();
    const existing = await prisma.eventFoodItem.findMany({
      where: tenantWhere({ eventId }),
    });
    const existingByFoodId = new Map(existing.map((row) => [row.foodItemId, row]));
    const targetIds = [...new Set(foodItemIds)];

    await prisma.eventFoodItem.deleteMany({
      where: tenantWhere({
        eventId,
        foodItemId: { notIn: targetIds.length > 0 ? targetIds : ['__none__'] },
      }),
    });

    const catalog = await prisma.foodItem.findMany({
      where: tenantWhere({ id: { in: targetIds } }),
    });
    const catalogById = new Map(catalog.map((item) => [item.id, item]));

    for (const foodItemId of targetIds) {
      const foodItem = catalogById.get(foodItemId);
      if (!foodItem) continue;
      if (existingByFoodId.has(foodItemId)) continue;
      await prisma.eventFoodItem.create({
        data: {
          tenantId,
          eventId,
          foodItemId,
          sortOrder: foodItem.sortOrder,
        },
      });
    }
  },

  updateAssignmentSoldOut: async (eventId: string, foodItemId: string, soldOut: boolean) => {
    const result = await prisma.eventFoodItem.updateMany({
      where: tenantWhere({ eventId, foodItemId }),
      data: { soldOut },
    });
    if (result.count === 0) throw new Error('Gericht ist dieser Veranstaltung nicht zugeordnet');
    const assignment = await foodItemRepository.findAssignment(eventId, foodItemId);
    if (!assignment) throw new Error('Gericht ist dieser Veranstaltung nicht zugeordnet');
    return foodItemRepository.mapForEvent(assignment);
  },

  findById: (id: string) =>
    prisma.foodItem.findFirst({ where: tenantWhere({ id }) }),

  findByIds: (ids: string[]) => {
    if (ids.length === 0) return Promise.resolve([]);
    return prisma.foodItem.findMany({
      where: tenantWhere({ id: { in: ids } }),
    });
  },

  create: (data: Omit<Prisma.FoodItemUncheckedCreateWithoutTenantInput, 'tenantId'>) =>
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

  findEventIdsForFoodItem: async (foodItemId: string) => {
    const rows = await prisma.eventFoodItem.findMany({
      where: tenantWhere({ foodItemId }),
      select: { eventId: true },
    });
    return [...new Set(rows.map((row) => row.eventId))];
  },

  countOrderReferences: (foodItemId: string) =>
    prisma.orderItem.count({
      where: {
        foodItemId,
        order: tenantWhere({}),
      },
    }),

  delete: async (id: string) => {
    await prisma.eventFoodItem.deleteMany({ where: tenantWhere({ foodItemId: id }) });
    return prisma.foodItem.deleteMany({ where: tenantWhere({ id }) });
  },
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

  setReleasedToKitchen: async (id: string, released: boolean) => {
    const tenantId = requireTenantId();
    const result = await prisma.order.updateMany({
      where: { tenantId, id },
      data: { releasedToKitchen: released },
    });
    if (result.count === 0) throw new Error('Bestellung nicht gefunden');
    return orderRepository.findById(id);
  },

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
