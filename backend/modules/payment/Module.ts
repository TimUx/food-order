import {
  BaseModule,
  type FeatureContext,
  type ModuleHealthCheckResult,
  type ModuleRouteRegistration,
} from '../../src/module-system/types';
import { paymentServiceRegistry } from '../../src/module-system/extension-points';
import { defaultPaymentConfig, paymentConfigSchema } from './config';
import { paymentManager } from './PaymentManager';
import {
  createPaymentPublicRoutes,
} from './routes';
import { createPaymentAdminRoutes } from './adminRoutes';
import { createPaymentService } from './services/PaymentServiceImpl';

class PaymentModule extends BaseModule {
  readonly id = 'payment';
  readonly name = 'Online-Zahlung';
  readonly version = '1.0.0';
  readonly description = 'Online-Zahlungen über Stripe, PayPal, VR Payment, S-Payment, PAYONE und SumUp';
  readonly author = 'FestManager';

  async install(_context: FeatureContext): Promise<void> {
    // Schema-Migrationen werden vom ModuleMigrationService ausgeführt
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
    // Schema-Migrationen werden vom ModuleMigrationService ausgeführt
  }

  registerRoutes(context: FeatureContext): ModuleRouteRegistration[] {
    return [
      { path: '/', router: createPaymentPublicRoutes(context) },
      {
        path: '/',
        mountPath: '/admin',
        router: createPaymentAdminRoutes(context),
      },
    ];
  }

  registerHooks() {
    return [];
  }

  async healthCheck(context: FeatureContext): Promise<ModuleHealthCheckResult> {
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
