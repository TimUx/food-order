import {
  BaseModule,
  type FeatureContext,
  type ModuleHealthCheckResult,
  type ModuleRouteRegistration,
} from '../../src/module-system/types';
import { notificationServiceRegistry } from '../../src/module-system/extension-points';
import { defaultNotificationConfig, notificationsConfigSchema } from './config';
import { createNotificationHookSubscriptions } from './hooks';
import { migrateLegacyEmailSettings } from './migrateLegacyEmail';
import { notificationManager } from './NotificationManager';
import { createNotificationAdminRoutes } from './routes';
import { createNotificationService } from './services/NotificationServiceImpl';

class NotificationsModule extends BaseModule {
  readonly id = 'notifications';
  readonly name = 'Benachrichtigungen';
  readonly version = '1.0.0';
  readonly description = 'E-Mail, ntfy, Discord, Slack und Microsoft Teams';
  readonly author = 'FestManager';

  async install(_context: FeatureContext): Promise<void> {}

  async uninstall(_context: FeatureContext): Promise<void> {
    notificationServiceRegistry.unregister();
  }

  async initialize(context: FeatureContext): Promise<void> {
    const config = await context.getConfig(this.id);
    if (!config || Object.keys(config).length === 0) {
      await context.setConfig(this.id, defaultNotificationConfig);
    }
    await migrateLegacyEmailSettings(context);
  }

  async enable(context: FeatureContext): Promise<void> {
    notificationServiceRegistry.register(createNotificationService(context));
  }

  async disable(_context: FeatureContext): Promise<void> {
    notificationServiceRegistry.unregister();
  }

  async shutdown(_context: FeatureContext): Promise<void> {
    notificationServiceRegistry.unregister();
  }

  registerRoutes(context: FeatureContext): ModuleRouteRegistration[] {
    return [
      {
        path: '/',
        mountPath: '/admin',
        router: createNotificationAdminRoutes(context),
        requiredPermission: 'notifications.settings',
        requireActivation: false,
      },
    ];
  }

  registerHooks(context: FeatureContext) {
    return createNotificationHookSubscriptions(context);
  }

  async healthCheck(context: FeatureContext): Promise<ModuleHealthCheckResult> {
    const active = await notificationManager.hasActiveChannel(context);
    if (!active) {
      return { status: 'degraded', message: 'Kein Benachrichtigungskanal konfiguriert' };
    }
    const checks = await notificationManager.runHealthChecks(context);
    const ok = Object.values(checks).filter((c) => c.ok);
    return {
      status: ok.length > 0 ? 'healthy' : 'degraded',
      message: `${ok.length} Kanal/Kanäle bereit`,
      details: checks,
    };
  }

  getConfigContract() {
    return { defaults: defaultNotificationConfig, schema: notificationsConfigSchema };
  }
}

export const notificationsModule = new NotificationsModule();
