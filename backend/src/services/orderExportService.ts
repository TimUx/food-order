import ExcelJS from 'exceljs';
import { Order } from '@prisma/client';
import { orderRepository } from '../repositories';
import { eventService } from './eventService';
import {
  formatOrderNumber,
  formatEventDate,
  formatDateTimeDE,
  STATUS_LABELS,
  SOURCE_LABELS,
} from '../utils/helpers';

type ExportOrder = Order & {
  customer?: { firstName: string; lastName: string; email?: string | null; phone?: string | null } | null;
  items: Array<{
    quantity: number;
    unitPrice: unknown;
    lineTotal: unknown;
    foodItem: { name: string };
  }>;
};

export type EventOrdersExport = Awaited<ReturnType<typeof orderExportService.getEventExport>>;

const HEADER_ROW = 7;
const DATA_START_ROW = 8;

const HEADERS = [
  'Bestellnummer',
  'Status',
  'Quelle',
  'Bestellt am',
  'Bestelldatum',
  'Vorname',
  'Nachname',
  'E-Mail',
  'Telefon',
  'Gericht',
  'Menge',
  'Einzelpreis',
  'Zeilensumme',
  'Gesamtbetrag',
  'Fertig um',
  'Abgeholt um',
  'Storniert um',
] as const;

const COLUMN_COUNT = HEADERS.length;

const COLUMN_WIDTHS = [12, 14, 12, 18, 14, 14, 14, 24, 16, 22, 8, 12, 12, 12, 18, 18, 18];

function formatExportDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  return formatDateTimeDE(value instanceof Date ? value : new Date(value));
}

function mapExportOrder(order: ExportOrder, event: { name: string; date: Date; startTime: string; endTime: string }) {
  const itemsSummary = order.items
    .map((item) => `${item.quantity}× ${item.foodItem.name}`)
    .join('; ');

  return {
    eventName: event.name,
    eventDateLabel: formatEventDate(event.date),
    eventTime: `${event.startTime}–${event.endTime}`,
    orderNumber: formatOrderNumber(order.orderNumber),
    status: STATUS_LABELS[order.status],
    source: SOURCE_LABELS[order.source],
    createdAt: formatExportDateTime(order.createdAt),
    orderDate: formatEventDate(order.orderDate),
    customerFirstName: order.customer?.firstName ?? '',
    customerLastName: order.customer?.lastName ?? '',
    customerEmail: order.customer?.email ?? '',
    customerPhone: order.customer?.phone ?? '',
    itemsSummary,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPriceAmount: Number(order.totalPrice),
    readyAt: formatExportDateTime(order.readyAt),
    pickedUpAt: formatExportDateTime(order.pickedUpAt),
    cancelledAt: formatExportDateTime(order.cancelledAt),
    items: order.items.map((item) => ({
      name: item.foodItem.name,
      quantity: item.quantity,
      unitPriceAmount: Number(item.unitPrice),
      lineTotalAmount: Number(item.lineTotal),
    })),
  };
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FF1A1A1A' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EEF4' },
  };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.height = 22;
  row.eachCell((cell) => {
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF9EB4CE' } },
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
}

function applyDataRowStyle(row: ExcelJS.Row, zebra: boolean) {
  if (zebra) {
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' },
    };
  }
  row.alignment = { vertical: 'top', wrapText: true };
}

function setCurrencyCell(cell: ExcelJS.Cell, value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    cell.value = null;
    return;
  }
  cell.value = value;
  cell.numFmt = '#,##0.00 "€"';
  cell.alignment = { horizontal: 'right' };
}

export const orderExportService = {
  async getEventExport(eventId: string) {
    const event = await eventService.getById(eventId);
    const orders = await orderRepository.findByEvent(eventId);

    return {
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        eventDateLabel: formatEventDate(event.date),
        startTime: event.startTime,
        endTime: event.endTime,
      },
      exportedAt: new Date().toISOString(),
      orderCount: orders.length,
      orders: orders.map((order) => mapExportOrder(order as ExportOrder, event)),
    };
  },

  buildFilename(eventName: string, extension: 'xlsx' | 'csv' = 'xlsx'): string {
    const safe = eventName
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'veranstaltung';
    const date = new Date().toISOString().slice(0, 10);
    return `bestellungen-${safe}-${date}.${extension}`;
  },

  async buildXlsx(exportData: EventOrdersExport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FestSchmiede';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bestellungen', {
      views: [{ state: 'frozen', ySplit: HEADER_ROW, activeCell: 'A8' }],
    });

    sheet.columns = HEADERS.map((header, index) => ({
      header,
      key: header,
      width: COLUMN_WIDTHS[index] ?? 14,
    }));

    sheet.mergeCells(1, 1, 1, COLUMN_COUNT);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `Bestellübersicht – ${exportData.event.name}`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { vertical: 'middle' };

    const metaRows: Array<[string, string | number]> = [
      ['Veranstaltung', exportData.event.name],
      ['Veranstaltungsdatum', `${exportData.event.eventDateLabel} (${exportData.event.startTime}–${exportData.event.endTime})`],
      ['Exportiert am', formatExportDateTime(exportData.exportedAt)],
      ['Anzahl Bestellungen', exportData.orderCount],
    ];

    metaRows.forEach(([label, value], index) => {
      const rowNumber = index + 2;
      const labelCell = sheet.getCell(rowNumber, 1);
      const valueCell = sheet.getCell(rowNumber, 2);
      labelCell.value = label;
      labelCell.font = { bold: true };
      valueCell.value = value;
      sheet.mergeCells(rowNumber, 2, rowNumber, COLUMN_COUNT);
    });

    sheet.getRow(HEADER_ROW).values = [...HEADERS];
    applyHeaderStyle(sheet.getRow(HEADER_ROW));

    let rowIndex = DATA_START_ROW;
    let zebra = false;

    for (const order of exportData.orders) {
      if (order.items.length === 0) {
        const row = sheet.getRow(rowIndex++);
        row.values = [
          order.orderNumber,
          order.status,
          order.source,
          order.createdAt,
          order.orderDate,
          order.customerFirstName,
          order.customerLastName,
          order.customerEmail,
          order.customerPhone,
          '',
          '',
          null,
          null,
          order.totalPriceAmount,
          order.readyAt,
          order.pickedUpAt,
          order.cancelledAt,
        ];
        setCurrencyCell(row.getCell(14), order.totalPriceAmount);
        applyDataRowStyle(row, zebra);
        zebra = !zebra;
        continue;
      }

      order.items.forEach((item, itemIndex) => {
        const row = sheet.getRow(rowIndex++);
        row.values = [
          order.orderNumber,
          order.status,
          order.source,
          order.createdAt,
          order.orderDate,
          order.customerFirstName,
          order.customerLastName,
          order.customerEmail,
          order.customerPhone,
          item.name,
          item.quantity,
          item.unitPriceAmount,
          item.lineTotalAmount,
          itemIndex === 0 ? order.totalPriceAmount : null,
          itemIndex === 0 ? order.readyAt : '',
          itemIndex === 0 ? order.pickedUpAt : '',
          itemIndex === 0 ? order.cancelledAt : '',
        ];
        setCurrencyCell(row.getCell(12), item.unitPriceAmount);
        setCurrencyCell(row.getCell(13), item.lineTotalAmount);
        if (itemIndex === 0) {
          setCurrencyCell(row.getCell(14), order.totalPriceAmount);
        }
        row.getCell(11).alignment = { horizontal: 'center' };
        applyDataRowStyle(row, zebra);
        zebra = !zebra;
      });
    }

    const lastDataRow = Math.max(rowIndex - 1, HEADER_ROW);
    sheet.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: lastDataRow, column: COLUMN_COUNT },
    };

    const revenue = exportData.orders.reduce((sum, order) => sum + order.totalPriceAmount, 0);
    const summaryRowNumber = lastDataRow + 2;
    const summaryRow = sheet.getRow(summaryRowNumber);
    summaryRow.getCell(1).value = 'Gesamtumsatz';
    summaryRow.getCell(1).font = { bold: true };
    setCurrencyCell(summaryRow.getCell(14), revenue);
    summaryRow.getCell(14).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },

  async getEventXlsx(eventId: string) {
    const exportData = await this.getEventExport(eventId);
    return {
      filename: this.buildFilename(exportData.event.name, 'xlsx'),
      content: await this.buildXlsx(exportData),
    };
  },
};
