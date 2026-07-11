import { foodItemRepository } from '../repositories';
import { eventService } from './eventService';
import { AppError } from '../middleware/errorHandler';
import { emitFoodItemsUpdate } from '../socket';
import { Prisma } from '@prisma/client';
import { formatEventDate } from '../utils/helpers';

export const foodItemService = {
  async getByEvent(eventId: string, publicOnly = false) {
    return foodItemRepository.findByEvent(eventId, publicOnly);
  },

  async getPublicItems() {
    const event = await eventService.getActive();
    if (!event.onlineOrdersActive || event.ordersClosed) {
      return { event, items: [] };
    }
    const items = await foodItemRepository.findByEvent(event.id, true);
    return {
      event: {
        ...event,
        eventDateLabel: formatEventDate(event.date),
      },
      items,
      preOrderInfo: 'Vorbestellung möglich',
    };
  },

  async setSoldOut(id: string, soldOut: boolean) {
    return this.update(id, { soldOut });
  },

  async getById(id: string) {
    const item = await foodItemRepository.findById(id);
    if (!item) throw new AppError(404, 'Gericht nicht gefunden');
    return item;
  },

  async create(eventId: string, data: {
    name: string;
    description?: string;
    price: number;
    sortOrder?: number;
    active?: boolean;
    soldOut?: boolean;
    maxQuantity?: number | null;
    imageUrl?: string;
  }) {
    await eventService.getById(eventId);
    const item = await foodItemRepository.create({
      name: data.name,
      description: data.description,
      price: new Prisma.Decimal(data.price),
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
      soldOut: data.soldOut ?? false,
      maxQuantity: data.maxQuantity,
      imageUrl: data.imageUrl,
      eventId,
    });
    const items = await foodItemRepository.findByEvent(eventId);
    emitFoodItemsUpdate(eventId, items);
    return item;
  },

  async update(id: string, data: Partial<{
    name: string;
    description?: string;
    price: number;
    sortOrder: number;
    active: boolean;
    soldOut: boolean;
    maxQuantity: number | null;
    imageUrl: string | null;
  }>) {
    const existing = await this.getById(id);
    const updateData: Prisma.FoodItemUpdateInput = { ...data };
    if (data.price !== undefined) {
      updateData.price = new Prisma.Decimal(data.price);
    }
    const item = await foodItemRepository.update(id, updateData);
    const items = await foodItemRepository.findByEvent(existing.eventId);
    emitFoodItemsUpdate(existing.eventId, items);
    return item;
  },

  async delete(id: string) {
    const existing = await this.getById(id);
    await foodItemRepository.delete(id);
    const items = await foodItemRepository.findByEvent(existing.eventId);
    emitFoodItemsUpdate(existing.eventId, items);
  },
};
