import {
  BaseModule,
  type FeatureContext,
  type ModuleHealthCheckResult,
  type ModuleRouteRegistration,
} from '../../src/platform/module-api';
import { legalContentServiceRegistry } from '../../src/platform/module-api';
import { defaultLegalConfig, legalConfigSchema } from './config';
import { createLegalAdminRoutes } from './routes';
import { createLegalContentService } from './services/LegalContentServiceImpl';
import { legalPageService } from './services/LegalPageService';

class LegalModule extends BaseModule {
  readonly id = 'legal';
  readonly name = 'Rechtliche Informationen';
  readonly version = '1.4.0';
  readonly description = 'Optionale Verwaltung von Impressum, Datenschutz, AGB und Widerruf';
  readonly author = 'FestSchmiede';

  async install(_context: FeatureContext): Promise<void> {
    await legalPageService.ensureDefaults();
  }

  async initialize(context: FeatureContext): Promise<void> {
    const config = await context.getConfig(this.id);
    if (!config || Object.keys(config).length === 0) {
      await context.setConfig(this.id, defaultLegalConfig);
    }
    await legalPageService.ensureDefaults();
  }

  async uninstall(_context: FeatureContext): Promise<void> {
    legalContentServiceRegistry.unregister();
  }

  async enable(_context: FeatureContext): Promise<void> {
    legalContentServiceRegistry.register(createLegalContentService());
  }

  async disable(_context: FeatureContext): Promise<void> {
    legalContentServiceRegistry.unregister();
  }

  async shutdown(_context: FeatureContext): Promise<void> {
    legalContentServiceRegistry.unregister();
  }

  registerRoutes(context: FeatureContext): ModuleRouteRegistration[] {
    return [
      {
        path: '/',
        mountPath: '/admin',
        router: createLegalAdminRoutes(context),
        requiredPermission: 'legal.view',
        requireActivation: false,
      },
    ];
  }

  async healthCheck(_context: FeatureContext): Promise<ModuleHealthCheckResult> {
    try {
      const pages = await legalPageService.listAdminPages();
      const published = pages.filter((page) => page.isPubliclyVisible);
      return {
        status: published.length > 0 ? 'healthy' : 'degraded',
        message: published.length > 0
          ? `${published.length} Seite(n) veroeffentlicht`
          : 'Keine rechtlichen Seiten veroeffentlicht',
      };
    } catch (err) {
      return {
        status: 'degraded',
        message: err instanceof Error ? err.message : 'Health-Check fehlgeschlagen',
      };
    }
  }

  getConfigContract() {
    return { defaults: defaultLegalConfig, schema: legalConfigSchema };
  }
}

export const legalModule = new LegalModule();
