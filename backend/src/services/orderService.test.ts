import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler';

const mockFindByEvent = vi.fn();
const mockFindByOrderNumber = vi.fn();
const mockGetActive = vi.fn();
const mockFilterReleasedIds = vi.fn();

vi.mock('../repositories', () => ({
  orderRepository: {
    findByEvent: (...args: unknown[]) => mockFindByEvent(...args),
    findByOrderNumber: (...args: unknown[]) => mockFindByOrderNumber(...args),
  },
  customerRepository: {},
  foodItemRepository: {},
}));

vi.mock('./eventService', () => ({
  eventService: {
    getActive: () => mockGetActive(),
    getPickupEvent: async (id: string) => {
      const event = await mockGetActive();
      return { ...event, id };
    },
    getOrderableById: async (id: string, _channel: string) => {
      const event = await mockGetActive();
      return { ...event, id, onlineOrdersActive: true, cashierActive: true, ordersClosed: false };
    },
  },
}));

vi.mock('../core/extensionPoints', () => ({
  getPaymentServiceRegistry: () => ({
    filterReleasedIds: (...args: unknown[]) => mockFilterReleasedIds(...args),
  }),
  getPayableResourceRegistry: vi.fn(),
}));

vi.mock('../socket', () => ({
  emitOrderCreated: vi.fn(),
  emitOrderUpdate: vi.fn(),
}));

vi.mock('../platform/bootstrap', () => ({
  hookSystem: { emit: vi.fn() },
}));

vi.mock('./clubService', () => ({
  clubService: {
    getOrderSettings: vi.fn(),
    getCancellationSettings: vi.fn(),
  },
}));

import { orderService } from './orderService';

const eventDate = new Date('2026-07-11T00:00:00.000Z');

function buildOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    lookupToken: 'token-1',
    eventId: 'event-1',
    orderNumber: 42,
    orderDate: eventDate,
    source: 'CASHIER',
    status: 'NEW',
    totalPrice: 10,
    createdAt: new Date('2026-07-11T12:00:00.000Z'),
    readyAt: null,
    pickedUpAt: null,
    cancelledAt: null,
    customer: null,
    event: { date: eventDate, startTime: '18:00' },
    items: [
      {
        id: 'item-1',
        foodItemId: 'food-1',
        quantity: 1,
        unitPrice: 10,
        lineTotal: 10,
        foodItem: { name: 'Bratwurst' },
      },
    ],
    ...overrides,
  };
}

describe('orderService.getByEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('liefert Kassenbestellungen auch ohne freigegebene Zahlung', async () => {
    const cashierOrder = buildOrder({ id: 'cashier-1', source: 'CASHIER' });
    const onlineOrder = buildOrder({
      id: 'online-1',
      source: 'ONLINE',
      customer: { firstName: 'Max', lastName: 'Mustermann', email: null, phone: null },
    });
    mockFindByEvent.mockResolvedValue([cashierOrder, onlineOrder]);
    mockFilterReleasedIds.mockResolvedValue(['online-1']);

    const result = await orderService.getByEvent('event-1');

    expect(result.map((o) => o.id)).toEqual(['cashier-1', 'online-1']);
  });

  it('blendet Online-Bestellungen ohne freigegebene Zahlung aus', async () => {
    const onlineOrder = buildOrder({
      id: 'online-1',
      source: 'ONLINE',
      customer: { firstName: 'Max', lastName: 'Mustermann', email: null, phone: null },
    });
    mockFindByEvent.mockResolvedValue([onlineOrder]);
    mockFilterReleasedIds.mockResolvedValue([]);

    const result = await orderService.getByEvent('event-1');

    expect(result).toHaveLength(0);
  });
});

describe('orderService.getStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zählt nur für Mitarbeiter sichtbare Bestellungen', async () => {
    const visibleOnline = buildOrder({
      id: 'online-1',
      source: 'ONLINE',
      status: 'NEW',
      customer: { firstName: 'Max', lastName: 'Mustermann', email: null, phone: null },
    });
    const hiddenOnline = buildOrder({
      id: 'online-2',
      source: 'ONLINE',
      status: 'NEW',
      customer: { firstName: 'Erika', lastName: 'Beispiel', email: null, phone: null },
    });
    mockFindByEvent.mockResolvedValue([visibleOnline, hiddenOnline]);
    mockFilterReleasedIds.mockResolvedValue(['online-1']);

    const stats = await orderService.getStats('event-1');

    expect(stats.totalOrders).toBe(1);
    expect(stats.openOrders).toBe(1);
    expect(stats.revenue).toBe(10);
  });
});

describe('orderService.lookupByNumberAndName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActive.mockResolvedValue({ id: 'event-1', date: eventDate });
  });

  it('findet Vor-Ort-Bestellungen nur anhand der Nummer', async () => {
    mockFindByOrderNumber.mockResolvedValue(buildOrder({ source: 'CASHIER', customer: null }));
    mockFilterReleasedIds.mockResolvedValue([]);

    const result = await orderService.lookupByNumberAndName('event-1', 42);

    expect(result.orderNumber).toBe(42);
    expect(result.source).toBe('CASHIER');
  });

  it('verlangt bei Online-Bestellungen mit Kunde einen Nachnamen', async () => {
    mockFindByOrderNumber.mockResolvedValue(
      buildOrder({
        source: 'ONLINE',
        customer: { firstName: 'Max', lastName: 'Mustermann', email: null, phone: null },
      })
    );

    await expect(orderService.lookupByNumberAndName('event-1', 42)).rejects.toEqual(
      new AppError(400, 'Nachname erforderlich')
    );
  });

  it('lehnt falschen Nachnamen bei Online-Bestellungen ab', async () => {
    mockFindByOrderNumber.mockResolvedValue(
      buildOrder({
        source: 'ONLINE',
        customer: { firstName: 'Max', lastName: 'Mustermann', email: null, phone: null },
      })
    );
    mockFilterReleasedIds.mockResolvedValue(['order-1']);

    await expect(orderService.lookupByNumberAndName('event-1', 42, 'Falsch')).rejects.toEqual(
      new AppError(404, 'Bestellung nicht gefunden')
    );
  });
});
