import { describe, it, expect } from 'vitest';
import { orderExportService } from './orderExportService';

const sampleExport = {
  event: {
    id: 'event-1',
    name: 'Sommerfest',
    date: new Date('2026-08-15'),
    eventDateLabel: '15.08.2026',
    startTime: '18:00',
    endTime: '23:00',
  },
  exportedAt: '2026-08-15T10:00:00.000Z',
  orderCount: 1,
  orders: [
    {
      eventName: 'Sommerfest',
      eventDateLabel: '15.08.2026',
      eventTime: '18:00–23:00',
      orderNumber: '001',
      status: 'Neu',
      source: 'Online',
      createdAt: '15.08.2026, 12:00',
      orderDate: '15.08.2026',
      customerFirstName: 'Max',
      customerLastName: 'Mustermann',
      customerEmail: 'max@example.com',
      customerPhone: '0123',
      itemsSummary: '2× Bratwurst',
      itemCount: 2,
      totalPriceAmount: 9,
      readyAt: '',
      pickedUpAt: '',
      cancelledAt: '',
      items: [
        { name: 'Bratwurst', quantity: 2, unitPriceAmount: 4.5, lineTotalAmount: 9 },
      ],
    },
  ],
} satisfies Awaited<ReturnType<typeof orderExportService.getEventExport>>;

describe('orderExportService.buildXlsx', () => {
  it('erzeugt eine gültige XLSX-Datei', async () => {
    const buffer = await orderExportService.buildXlsx(sampleExport);
    expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('verwendet xlsx als Dateiendung', () => {
    expect(orderExportService.buildFilename('Sommerfest', 'xlsx')).toMatch(/\.xlsx$/);
  });
});
