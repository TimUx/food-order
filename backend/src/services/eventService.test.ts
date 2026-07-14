import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler';

const mockFindById = vi.fn();
const mockCountOrders = vi.fn();
const mockDelete = vi.fn();

vi.mock('../repositories', () => ({
  eventRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    countOrders: (...args: unknown[]) => mockCountOrders(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('../socket', () => ({
  emitEventUpdate: vi.fn(),
}));

vi.mock('../platform/bootstrap', () => ({
  hookSystem: { emitAsync: vi.fn() },
}));

import { eventService } from './eventService';

describe('eventService.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({
      id: 'event-1',
      name: 'Sommerfest',
      isActive: false,
    });
    mockDelete.mockResolvedValue(undefined);
  });

  it('löscht Veranstaltungen ohne Bestellungen', async () => {
    mockCountOrders.mockResolvedValue(0);

    await eventService.delete('event-1');

    expect(mockDelete).toHaveBeenCalledWith('event-1');
  });

  it('verweigert Löschen bei vorhandenen Bestellungen', async () => {
    mockCountOrders.mockResolvedValue(2);

    await expect(eventService.delete('event-1')).rejects.toEqual(
      new AppError(
        409,
        'Die Veranstaltung kann nicht gelöscht werden, weil bereits Bestellungen existieren. Deaktivieren Sie sie stattdessen oder schließen Sie die Bestellungen.',
        'EVENT_HAS_ORDERS'
      )
    );
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
