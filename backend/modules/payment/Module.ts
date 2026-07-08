import {
  BaseModule,
  type FeatureContext,
  type ModuleHealthCheckResult,
  type ModuleMenuItem,
  type ModulePermissionDefinition,
  type ModuleRouteRegistration,
} from '../../src/module-system/types';
import { paymentServiceRegistry } from '../../src/module-system/extension-points';
import { defaultPaymentConfig, paymentConfigSchema, PAYMENT_PERMISSIONS } from './config';
import { paymentManager } from './PaymentManager';
import { createPaymentRoutes } from './routes';
import { runPaymentMigrations } from './services/MigrationRunner';
import { createPaymentService } from './services/PaymentServiceImpl';

class PaymentModule extends BaseModule {
  readonly id = 'payment';
  readonly name = 'Online-Zahlung';
  readonly version = '1.0.0';
  readonly description = 'Online-Zahlungen über Stripe, PayPal, VR Payment, S-Payment, PAYONE und SumUp';
  readonly author = 'Vereinsbestellung';

  async install(_context: FeatureContext): Promise<void> {
    await runPaymentMigrations();
  }

  async uninstall(_context: FeatureContext): Promise<void> {
    paymentServiceRegistry.unregister();
  }

  async initialize(context: FeatureContext): Promise<void> {
    await paymentManager.initialize();
    const config = await context.getConfig(this.id);
    if (!config || Object.keys(config).length === 0) {
      await context.setConfig(this.id, defaultPaymentConfig);
    }
  }

  async enable(context: FeatureContext): Promise<void> {
    paymentServiceRegistry.register(createPaymentService(context));
  }

  async disable(_context: FeatureContext): Promise<void> {
    paymentServiceRegistry.unregister();
  }

  async shutdown(_context: FeatureContext): Promise<void> {
    paymentServiceRegistry.unregister();
  }

  async upgrade(_context: FeatureContext, _from: string, _to: string): Promise<void> {
    await runPaymentMigrations();
  }

  registerRoutes(context: FeatureContext): ModuleRouteRegistration[] {
    return [{ path: '/', router: createPaymentRoutes(context) }];
  }

  registerMenus(): ModuleMenuItem[] {
    return [{
      id: 'payment-settings',
      label: 'Payment',
      path: '/admin/module/payment',
      icon: 'Payment',
      parentId: 'modules',
      sortOrder: 10,
      requiredPermission: PAYMENT_PERMISSIONS.SETTINGS,
    }];
  }

  registerPermissions(): ModulePermissionDefinition[] {
    return [
      { key: PAYMENT_PERMISSIONS.VIEW, description: 'Zahlungsstatus einsehen' },
      { key: PAYMENT_PERMISSIONS.SETTINGS, description: 'Zahlungseinstellungen verwalten' },
      { key: PAYMENT_PERMISSIONS.REFUND, description: 'Rückerstattungen durchführen' },
    ];
  }

  registerHooks() {
    return [];
  }

  async healthCheck(context: FeatureContext): Promise<ModuleHealthCheckResult> {
    const { moduleRegistry } = await import('../../src/module-system/ModuleRegistry');
    if (!(await moduleRegistry.isActivated(this.id))) {
      return { status: 'unknown', message: 'Modul nicht aktiviert' };
    }

    const hasProvider = await paymentManager.hasActiveProvider(context);
    if (!hasProvider) {
      return { status: 'degraded', message: 'Kein aktiver Zahlungsanbieter' };
    }

    const checks = await paymentManager.runHealthChecks(context);
    const active = Object.entries(checks).filter(([, v]) => v.ok);
    return {
      status: active.length > 0 ? 'healthy' : 'degraded',
      message: `${active.length} Anbieter bereit`,
      details: checks,
    };
  }

  getConfigContract() {
    return { defaults: defaultPaymentConfig, schema: paymentConfigSchema };
  }
}

export const paymentModule = new PaymentModule();
