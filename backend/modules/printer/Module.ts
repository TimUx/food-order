import {
  BaseModule,
  type FeatureContext,
  type ModuleHealthCheckResult,
  type ModuleRouteRegistration,
} from '../../src/module-system/types';
import { printerServiceRegistry } from '../../src/module-system/extension-points';
import { defaultPrinterConfig, printerConfigSchema } from './config';
import { createPrinterHookSubscriptions } from './hooks';
import { printManager } from './PrintManager';
import { createPrinterAdminRoutes, createPrinterStaffRoutes } from './routes';
import { createPrinterService } from './services/PrinterServiceImpl';

class PrinterModule extends BaseModule {
  readonly id = 'printer';
  readonly name = 'Bondruck';
  readonly version = '1.0.0';
  readonly description = 'Bondruck für Küche und Kasse (ESC/POS, PDF, Browser, Bluetooth)';
  readonly author = 'FestManager';

  async install(_context: FeatureContext): Promise<void> {}

  async uninstall(_context: FeatureContext): Promise<void> {
    printerServiceRegistry.unregister();
  }

  async initialize(context: FeatureContext): Promise<void> {
    const config = await context.getConfig(this.id);
    if (!config || Object.keys(config).length === 0) {
      await context.setConfig(this.id, defaultPrinterConfig);
    }
  }

  async enable(context: FeatureContext): Promise<void> {
    printerServiceRegistry.register(createPrinterService(context));
  }

  async disable(_context: FeatureContext): Promise<void> {
    printerServiceRegistry.unregister();
  }

  async shutdown(_context: FeatureContext): Promise<void> {
    printerServiceRegistry.unregister();
  }

  registerRoutes(context: FeatureContext): ModuleRouteRegistration[] {
    return [
      {
        path: '/',
        mountPath: '/admin',
        router: createPrinterAdminRoutes(context),
        requiredPermission: 'printer.settings',
        requireActivation: false,
      },
      {
        path: '/',
        mountPath: '/staff',
        router: createPrinterStaffRoutes(context),
        requiredPermission: 'printer.print',
      },
    ];
  }

  registerHooks(context: FeatureContext) {
    return createPrinterHookSubscriptions(context);
  }

  async healthCheck(context: FeatureContext): Promise<ModuleHealthCheckResult> {
    const active = await printManager.hasActivePrinter(context);
    if (!active) {
      return { status: 'degraded', message: 'Kein Drucker konfiguriert' };
    }
    const checks = await printManager.runHealthChecks(context);
    const ok = Object.values(checks).filter((c) => c.ok);
    return {
      status: ok.length > 0 ? 'healthy' : 'degraded',
      message: `${ok.length} Drucker bereit`,
      details: checks,
    };
  }

  getConfigContract() {
    return { defaults: defaultPrinterConfig, schema: printerConfigSchema };
  }
}

export const printerModule = new PrinterModule();
