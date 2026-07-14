import { eventRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { emitEventUpdate } from '../socket';
import { hookSystem } from '../platform/bootstrap';
import { CORE_HOOKS } from '../platform/types';
import { formatEventDate, getTodayDate, normalizeDate } from '../utils/helpers';

function mapPublicEvent(event: {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  startTime: string;
  endTime: string;
}) {
  return {
    id: event.id,
    name: event.name,
    description: event.description ?? undefined,
    date: event.date,
    eventDateLabel: formatEventDate(event.date),
    startTime: event.startTime,
    endTime: event.endTime,
  };
}

function pickDefaultStaffEvent(
  events: Array<{ id: string; date: Date }>
) {
  if (events.length === 0) return null;
  const today = getTodayDate().getTime();
  const todayEvent = events.find((event) => normalizeDate(event.date).getTime() === today);
  return todayEvent ?? events[0];
}

export const eventService = {
  async getAll() {
    return eventRepository.findForTenant();
  },

  async getActiveEvents() {
    return eventRepository.findActiveEvents();
  },

  async getPublicOnlineEvents() {
    const events = await eventRepository.findOnlineOrderableEvents();
    return events.map(mapPublicEvent);
  },

  async getCashierEvents() {
    const events = await eventRepository.findCashierOrderableEvents();
    return events.map(mapPublicEvent);
  },

  async getPickupEvents() {
    const events = await eventRepository.findPickupEvents();
    return events.map(mapPublicEvent);
  },

  async getDefaultStaffEvent() {
    const events = await eventRepository.findActiveEvents();
    const event = pickDefaultStaffEvent(events);
    if (!event) throw new AppError(404, 'Keine aktive Veranstaltung');
    return eventRepository.findById(event.id);
  },

  async getActive() {
    const event = await this.getDefaultStaffEvent();
    if (!event) throw new AppError(404, 'Keine aktive Veranstaltung');
    return event;
  },

  async getById(id: string) {
    const event = await eventRepository.findById(id);
    if (!event) throw new AppError(404, 'Veranstaltung nicht gefunden');
    return event;
  },

  async getPickupEvent(id: string) {
    const event = await this.getById(id);
    if (!event.isActive) {
      throw new AppError(403, 'Diese Veranstaltung ist nicht aktiv');
    }
    if (event.ordersClosed) {
      throw new AppError(403, 'Bestellungen für diese Veranstaltung sind geschlossen');
    }
    return event;
  },

  /** Für Mitarbeiter-Abholung: aktiv reicht, auch wenn Online-Bestellung geschlossen ist. */
  async getStaffPickupEvent(id: string) {
    const event = await this.getById(id);
    if (!event.isActive) {
      throw new AppError(403, 'Diese Veranstaltung ist nicht aktiv');
    }
    return event;
  },

  async getOrderableById(id: string, channel: 'online' | 'cashier') {
    const event = await this.getById(id);
    if (!event.isActive) {
      throw new AppError(403, 'Diese Veranstaltung ist nicht aktiv');
    }
    if (event.ordersClosed) {
      throw new AppError(403, 'Bestellungen für diese Veranstaltung sind geschlossen');
    }
    if (channel === 'online' && !event.onlineOrdersActive) {
      throw new AppError(403, 'Online-Bestellung ist für diese Veranstaltung nicht verfügbar');
    }
    if (channel === 'cashier' && !event.cashierActive) {
      throw new AppError(403, 'Bestellung vor Ort ist für diese Veranstaltung nicht verfügbar');
    }
    return event;
  },

  async create(data: {
    name: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    onlineOrdersActive?: boolean;
    cashierActive?: boolean;
    ordersClosed?: boolean;
    isActive?: boolean;
    activateOnCreate?: boolean;
  }) {
    const { activateOnCreate, ...eventData } = data;
    const event = await eventRepository.create({
      name: eventData.name,
      description: eventData.description,
      date: new Date(eventData.date),
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      onlineOrdersActive: eventData.onlineOrdersActive ?? true,
      cashierActive: eventData.cashierActive ?? true,
      ordersClosed: eventData.ordersClosed ?? false,
      isActive: eventData.isActive ?? activateOnCreate ?? false,
    });
    hookSystem.emitAsync(CORE_HOOKS.EVENT_CREATED, event);
    return event;
  },

  async update(id: string, data: Partial<{
    name: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    onlineOrdersActive: boolean;
    cashierActive: boolean;
    ordersClosed: boolean;
    isActive: boolean;
    activateOnCreate?: boolean;
  }>) {
    await this.getById(id);
    const { activateOnCreate: _activateOnCreate, ...raw } = data;
    void _activateOnCreate;
    const updateData: Record<string, unknown> = { ...raw };
    if (raw.date) updateData.date = new Date(raw.date);
    const event = await eventRepository.update(id, updateData);
    emitEventUpdate(event);
    hookSystem.emitAsync(CORE_HOOKS.EVENT_UPDATED, event);
    return event;
  },

  async setActive(id: string) {
    await this.getById(id);
    const event = await eventRepository.setIsActive(id, true);
    emitEventUpdate(event);
    return event;
  },

  async delete(id: string) {
    await this.getById(id);
    const orderCount = await eventRepository.countOrders(id);
    if (orderCount > 0) {
      throw new AppError(
        409,
        'Die Veranstaltung kann nicht gelöscht werden, weil bereits Bestellungen existieren. Deaktivieren Sie sie stattdessen oder schließen Sie die Bestellungen.',
        'EVENT_HAS_ORDERS'
      );
    }
    await eventRepository.delete(id);
    emitEventUpdate({ id, deleted: true });
  },
};
