import { foodItemRepository } from '../repositories';
import { eventService } from './eventService';
import { AppError } from '../middleware/errorHandler';
import { emitFoodItemsUpdate } from '../socket';
import { Prisma } from '@prisma/client';
import { formatEventDate } from '../utils/helpers';

function mapCatalogItem(item: {
  id: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
  maxQuantity: number | null;
}) {
  return {
    ...item,
    price: Number(item.price),
    soldOut: false,
  };
}

async function emitUpdatesForFoodItem(foodItemId: string) {
  const eventIds = await foodItemRepository.findEventIdsForFoodItem(foodItemId);
  for (const eventId of eventIds) {
    const items = await foodItemRepository.findByEvent(eventId);
    emitFoodItemsUpdate(eventId, items);
  }
}

export const foodItemService = {
  async getCatalog(publicOnly = false) {
    const items = await foodItemRepository.findCatalog(publicOnly);
    return items.map(mapCatalogItem);
  },

  async getByEvent(eventId: string, publicOnly = false) {
    await eventService.getById(eventId);
    return foodItemRepository.findByEvent(eventId, publicOnly);
  },

  async getEventAssignments(eventId: string) {
    await eventService.getById(eventId);
    const catalog = await foodItemRepository.findCatalog();
    const assignments = await foodItemRepository.findAssignmentsByEvent(eventId);
    const assignedIds = new Set(assignments.map((row) => row.foodItemId));
    return catalog.map((item) => ({
      ...mapCatalogItem(item),
      assigned: assignedIds.has(item.id),
    }));
  },

  async setEventAssignments(eventId: string, foodItemIds: string[]) {
    await eventService.getById(eventId);
    const catalog = await foodItemRepository.findCatalog();
    const validIds = new Set(catalog.map((item) => item.id));
    for (const id of foodItemIds) {
      if (!validIds.has(id)) {
        throw new AppError(400, 'Ungültiger Katalogeintrag');
      }
    }
    await foodItemRepository.setEventAssignments(eventId, foodItemIds);
    const items = await foodItemRepository.findByEvent(eventId);
    emitFoodItemsUpdate(eventId, items);
    return items;
  },

  async getPublicItems(eventId: string) {
    const event = await eventService.getOrderableById(eventId, 'online');
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

  async setSoldOut(id: string, soldOut: boolean, eventId?: string) {
    const event = eventId ? await eventService.getById(eventId) : await eventService.getActive();
    const item = await foodItemRepository.updateAssignmentSoldOut(event.id, id, soldOut);
    emitFoodItemsUpdate(event.id, await foodItemRepository.findByEvent(event.id));
    return item;
  },

  async getById(id: string) {
    const item = await foodItemRepository.findById(id);
    if (!item) throw new AppError(404, 'Katalogeintrag nicht gefunden');
    return mapCatalogItem(item);
  },

  async createCatalogItem(data: {
    name: string;
    description?: string;
    price: number;
    sortOrder?: number;
    active?: boolean;
    maxQuantity?: number | null;
    imageUrl?: string;
  }) {
    const item = await foodItemRepository.create({
      name: data.name,
      description: data.description,
      price: new Prisma.Decimal(data.price),
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
      maxQuantity: data.maxQuantity,
      imageUrl: data.imageUrl,
    });
    return mapCatalogItem(item);
  },

  async createForEvent(
    eventId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      sortOrder?: number;
      active?: boolean;
      maxQuantity?: number | null;
      imageUrl?: string;
    }
  ) {
    const item = await this.createCatalogItem(data);
    const assignments = await this.getEventAssignments(eventId);
    const assignedIds = assignments.filter((entry) => entry.assigned).map((entry) => entry.id);
    await this.setEventAssignments(eventId, [...assignedIds, item.id]);
    const items = await foodItemRepository.findByEvent(eventId);
    return items.find((entry) => entry.id === item.id) ?? { ...item, eventId };
  },

  async update(id: string, data: Partial<{
    name: string;
    description?: string;
    price: number;
    sortOrder: number;
    active: boolean;
    maxQuantity: number | null;
    imageUrl: string | null;
  }>) {
    await this.getById(id);
    const updateData: Prisma.FoodItemUpdateInput = { ...data };
    if (data.price !== undefined) {
      updateData.price = new Prisma.Decimal(data.price);
    }
    const item = await foodItemRepository.update(id, updateData);
    await emitUpdatesForFoodItem(id);
    return mapCatalogItem(item);
  },

  async delete(id: string) {
    await this.getById(id);
    const orderReferences = await foodItemRepository.countOrderReferences(id);
    if (orderReferences > 0) {
      throw new AppError(
        409,
        'Der Katalogeintrag kann nicht gelöscht werden, weil er bereits in Bestellungen vorkommt. Deaktivieren Sie ihn stattdessen.',
        'FOOD_ITEM_IN_USE'
      );
    }
    const eventIds = await foodItemRepository.findEventIdsForFoodItem(id);
    await foodItemRepository.delete(id);
    for (const eventId of eventIds) {
      const items = await foodItemRepository.findByEvent(eventId);
      emitFoodItemsUpdate(eventId, items);
    }
  },
};
