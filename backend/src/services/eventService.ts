import { eventRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { emitEventUpdate } from '../socket';

export const eventService = {
  async getAll() {
    return eventRepository.findAll();
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
  }) {
    return eventRepository.create({
      name: data.name,
      description: data.description,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      onlineOrdersActive: data.onlineOrdersActive ?? true,
      cashierActive: data.cashierActive ?? true,
      ordersClosed: data.ordersClosed ?? false,
    });
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
    return event;
  },

  async setActive(id: string) {
    await this.getById(id);
    const event = await eventRepository.setActive(id);
    emitEventUpdate(event);
    return event;
  },
};
