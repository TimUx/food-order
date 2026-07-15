import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler';

const mockFindById = vi.fn();
const mockCountOrderReferences = vi.fn();
const mockFindEventIdsForFoodItem = vi.fn();
const mockDelete = vi.fn();
const mockFindByEvent = vi.fn();

vi.mock('../repositories', () => ({
  foodItemRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    countOrderReferences: (...args: unknown[]) => mockCountOrderReferences(...args),
    findEventIdsForFoodItem: (...args: unknown[]) => mockFindEventIdsForFoodItem(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    findByEvent: (...args: unknown[]) => mockFindByEvent(...args),
  },
}));

vi.mock('../socket', () => ({
  emitFoodItemsUpdate: vi.fn(),
}));

import { foodItemService } from './foodItemService';

describe('foodItemService.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({
      id: 'food-1',
      name: 'Bratwurst',
      description: null,
      price: 4.5,
      imageUrl: null,
      sortOrder: 0,
      active: true,
      maxQuantity: null,
    });
    mockFindEventIdsForFoodItem.mockResolvedValue(['event-1']);
    mockFindByEvent.mockResolvedValue([]);
    mockDelete.mockResolvedValue({ count: 1 });
  });

  it('löscht Gerichte ohne Bestellbezug', async () => {
    mockCountOrderReferences.mockResolvedValue(0);

    await foodItemService.delete('food-1');

    expect(mockDelete).toHaveBeenCalledWith('food-1');
  });

  it('verweigert Löschen bei Bestellbezug mit verständlicher Meldung', async () => {
    mockCountOrderReferences.mockResolvedValue(3);

    await expect(foodItemService.delete('food-1')).rejects.toEqual(
      new AppError(
        409,
        'Der Katalogeintrag kann nicht gelöscht werden, weil er bereits in Bestellungen vorkommt. Deaktivieren Sie ihn stattdessen.',
        'FOOD_ITEM_IN_USE'
      )
    );
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
