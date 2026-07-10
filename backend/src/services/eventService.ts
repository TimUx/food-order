import { eventRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { emitEventUpdate } from '../socket';
import { hookSystem } from '../platform/bootstrap';
import { CORE_HOOKS } from '../platform/types';

export const eventService = {
  async getAll() {
    return eventRepository.findForTenant();
  },

  async getActive() {
    const event = await eventRepository.findActive();
    if (!event) throw new AppError(404, 'Keine aktive Veranstaltung');
    return event;
  },

  async getById(id: string) {
    const event = await eventRepository.findById(id);
    if (!event) throw new AppError(404, 'Veranstaltung nicht gefunden');
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
    });
    hookSystem.emitAsync(CORE_HOOKS.EVENT_CREATED, event);
    if (activateOnCreate) {
      return this.setActive(event.id);
    }
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
  }>) {
    await this.getById(id);
    const updateData: Record<string, unknown> = { ...data };
    if (data.date) updateData.date = new Date(data.date);
    const event = await eventRepository.update(id, updateData);
    emitEventUpdate(event);
    hookSystem.emitAsync(CORE_HOOKS.EVENT_UPDATED, event);
    return event;
  },

  async setActive(id: string) {
    await this.getById(id);
    const event = await eventRepository.setActive(id);
    emitEventUpdate(event);
    return event;
  },
};
