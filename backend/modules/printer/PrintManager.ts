import { randomUUID } from 'crypto';
import type { FeatureContext } from '../../src/module-system/types';
import type { OrderPrintPayload, PrintTemplate } from '../../src/platform/extension-points/PrinterService';
import { CORE_CLUB_NAMESPACE } from '../../src/platform/settings/SettingsNamespaces';
import { logger } from '../../src/utils/logger';
import {
  defaultPrinterConfig,
  PRINTER_SLOT_IDS,
  type PrinterConfig,
  type PrinterSlotId,
} from './config';
import { slotSupportsTemplate } from './PrinterAdapter';
import { printerRegistry } from './PrinterRegistry';
import type { PrintJob } from './PrintJob';
import { buildKitchenTicket, buildReceiptTicket, buildTestTicket } from './services/TicketTemplateService';

type OrderHookPayload = OrderPrintPayload & { status?: string };

class PrintManager {
  private async loadConfig(context: FeatureContext): Promise<PrinterConfig> {
    const config = await context.getConfig<PrinterConfig>('printer');
    return { ...defaultPrinterConfig, ...config };
  }

  private async loadClubName(context: FeatureContext): Promise<string> {
    const values = await context.settings.getDecryptedValues(CORE_CLUB_NAMESPACE);
    return String(values.clubName ?? 'Veranstalter');
  }

  async hasActivePrinter(context: FeatureContext): Promise<boolean> {
    const config = await this.loadConfig(context);
    return PRINTER_SLOT_IDS.some((id) => {
      const slot = config[id];
      const adapter = printerRegistry.get(slot.type);
      return adapter?.implemented && adapter.isConfigured(slot);
    });
  }

  private createJob(
    template: PrintTemplate,
    printerId: PrinterSlotId,
    payload: OrderPrintPayload,
    ticket: { title: string; lines: string[]; html: string }
  ): PrintJob {
    return {
      id: randomUUID(),
      template,
      printerId,
      resourceType: 'order',
      resourceId: payload.id,
      eventId: payload.eventId,
      title: ticket.title,
      lines: ticket.lines,
      html: ticket.html,
      createdAt: new Date().toISOString(),
    };
  }

  private async dispatchJob(context: FeatureContext, job: PrintJob): Promise<void> {
    await this.processJob(context, job);
  }

  private async processJob(context: FeatureContext, job: PrintJob): Promise<void> {
    const config = await this.loadConfig(context);
    const slot = config[job.printerId];
    const adapter = printerRegistry.get(slot.type);
    if (!adapter?.implemented || !adapter.isConfigured(slot)) {
      logger.warn(`Drucker ${job.printerId} nicht konfiguriert`);
      return;
    }
    try {
      const result = await adapter.print(config, job.printerId, slot, job);
      if (result.ok) {
        logger.info(`Druckauftrag [${job.template}/${job.printerId}]: ${job.title}`);
      } else {
        logger.warn(`Druck fehlgeschlagen [${job.template}/${job.printerId}]: ${result.error}`);
      }
    } catch (err) {
      logger.warn(`Druckfehler [${job.template}/${job.printerId}]`, err);
    }
  }

  private async dispatchTemplate(
    context: FeatureContext,
    template: 'kitchen' | 'receipt',
    payload: OrderPrintPayload
  ): Promise<void> {
    const config = await this.loadConfig(context);
    const clubName = await this.loadClubName(context);
    const ticket = template === 'kitchen'
      ? buildKitchenTicket(payload, clubName)
      : buildReceiptTicket(payload, clubName);

    const printTemplate: PrintTemplate = template;
    const tasks = PRINTER_SLOT_IDS
      .filter((id) => slotSupportsTemplate(config[id], template))
      .map((id) => {
        const slot = config[id];
        const adapter = printerRegistry.get(slot.type);
        if (!adapter?.implemented || !adapter.isConfigured(slot)) return null;
        return this.dispatchJob(context, this.createJob(printTemplate, id, payload, ticket));
      })
      .filter(Boolean);

    await Promise.allSettled(tasks);
  }

  async printKitchen(context: FeatureContext, payload: OrderPrintPayload): Promise<void> {
    await this.dispatchTemplate(context, 'kitchen', payload);
  }

  async printReceipt(context: FeatureContext, payload: OrderPrintPayload): Promise<void> {
    await this.dispatchTemplate(context, 'receipt', payload);
  }

  async handleOrderCreated(context: FeatureContext, payload: OrderHookPayload): Promise<void> {
    const config = await this.loadConfig(context);

    if (config.autoPrint.kitchenOnOrderCreated) {
      await this.printKitchen(context, payload);
    }
    if (config.autoPrint.receiptOnCashier && payload.source === 'CASHIER') {
      await this.printReceipt(context, payload);
    }
  }

  async handleOrderPaid(context: FeatureContext, payload: OrderHookPayload): Promise<void> {
    const config = await this.loadConfig(context);
    if (config.autoPrint.kitchenOnOrderPaid) {
      await this.printKitchen(context, payload);
    }
  }

  async printKitchenForOrderId(context: FeatureContext, orderId: string): Promise<boolean> {
    const { orderRepository } = await import('../../src/repositories');
    const { formatOrderNumber } = await import('../../src/utils/helpers');
    const order = await orderRepository.findById(orderId);
    if (!order) return false;

    await this.printKitchen(context, {
      id: order.id,
      orderNumber: order.orderNumber,
      displayNumber: formatOrderNumber(order.orderNumber),
      eventId: order.eventId,
      source: order.source,
      totalPrice: Number(order.totalPrice),
      items: order.items.map((i) => ({
        name: i.foodItem.name,
        quantity: i.quantity,
        lineTotal: Number(i.lineTotal),
      })),
      customer: order.customer
        ? { firstName: order.customer.firstName, lastName: order.customer.lastName }
        : null,
    });
    return true;
  }

  async testPrinter(context: FeatureContext, slotId: PrinterSlotId) {
    const config = await this.loadConfig(context);
    const slot = config[slotId];
    const adapter = printerRegistry.get(slot.type);
    if (!adapter) return { ok: false, message: 'Adapter nicht gefunden' };
    if (!adapter.implemented) return { ok: false, message: `${adapter.label} noch nicht implementiert` };
    if (!adapter.isConfigured(slot)) return { ok: false, message: 'Drucker nicht konfiguriert' };

    if (adapter.testConnection) {
      const health = await adapter.testConnection(config, slot);
      if (!health.ok) return health;
    }

    const clubName = await this.loadClubName(context);
    const template = slot.template === 'receipt' ? 'receipt' : 'kitchen';
    const ticket = buildTestTicket(template, clubName);
    const job = this.createJob(template, slotId, {
      id: 'test',
      orderNumber: 0,
      displayNumber: 'TEST',
      eventId: 'test',
      source: 'TEST',
      totalPrice: 9.5,
      items: [{ name: 'Test', quantity: 1 }],
    }, ticket);
    return this.processJob(context, job).then(() => ({ ok: true, message: 'Testdruck gesendet' }));
  }

  async runHealthChecks(context: FeatureContext): Promise<Record<string, { ok: boolean; message?: string }>> {
    const config = await this.loadConfig(context);
    const results: Record<string, { ok: boolean; message?: string }> = {};
    for (const slotId of PRINTER_SLOT_IDS) {
      const slot = config[slotId];
      const adapter = printerRegistry.get(slot.type);
      if (!slot.enabled) {
        results[slotId] = { ok: false, message: 'Deaktiviert' };
        continue;
      }
      if (!adapter?.implemented) {
        results[slotId] = { ok: false, message: 'Nicht implementiert' };
        continue;
      }
      if (!adapter.isConfigured(slot)) {
        results[slotId] = { ok: false, message: 'Nicht konfiguriert' };
        continue;
      }
      results[slotId] = adapter.testConnection
        ? await adapter.testConnection(config, slot)
        : { ok: true, message: 'Bereit' };
    }
    return results;
  }

  async discoverNetworkPrinters(context: FeatureContext) {
    const config = await this.loadConfig(context);
    const adapter = printerRegistry.get('escpos-network');
    if (!adapter?.discover) return [];
    return adapter.discover(config);
  }
}

export const printManager = new PrintManager();
