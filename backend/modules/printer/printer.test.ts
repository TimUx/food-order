import { describe, it, expect } from 'vitest';
import { defaultPrinterConfig } from './config';
import { slotSupportsTemplate } from './PrinterAdapter';
import { EscPosNetworkAdapter } from './adapters/EscPosNetworkAdapter';
import { BluetoothAdapter } from './adapters/BluetoothAdapter';

describe('Printer module', () => {
  it('ESC/POS network requires host when enabled', () => {
    const adapter = new EscPosNetworkAdapter();
    expect(adapter.isConfigured({ enabled: true, type: 'escpos-network', port: 9100, template: 'kitchen' })).toBe(false);
    expect(adapter.isConfigured({
      enabled: true,
      type: 'escpos-network',
      host: '192.168.1.50',
      port: 9100,
      template: 'kitchen',
    })).toBe(true);
  });

  it('Bluetooth adapter is never configured', () => {
    const bt = new BluetoothAdapter();
    expect(bt.implemented).toBe(false);
    expect(bt.isConfigured({ enabled: true, type: 'bluetooth', port: 9100, template: 'kitchen' })).toBe(false);
  });

  it('template assignment respects slot config', () => {
    expect(slotSupportsTemplate({ enabled: true, type: 'browser', port: 9100, template: 'both' }, 'kitchen')).toBe(true);
    expect(slotSupportsTemplate({ enabled: true, type: 'browser', port: 9100, template: 'receipt' }, 'kitchen')).toBe(false);
  });

  it('defaults kitchen print to order-created and order-paid hooks', () => {
    expect(defaultPrinterConfig.autoPrint.kitchenOnOrderCreated).toBe(true);
    expect(defaultPrinterConfig.autoPrint.kitchenOnOrderPaid).toBe(true);
  });
});
