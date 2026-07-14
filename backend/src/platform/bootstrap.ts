import { ServiceContainer, PLATFORM_TOKENS } from './ServiceContainer';
import { EventBus } from './EventBus';
import { HookSystem } from './HookSystem';
import { MetadataRegistry } from './MetadataRegistry';
import { ExtensionPointRegistry, EXTENSION_POINT_NAMES } from './ExtensionPointRegistry';
import { HealthService } from './HealthService';
import { AuditService } from './AuditService';
import { FeatureFlags } from './FeatureFlags';
import { createFeatureContext } from './FeatureContext';
import { ModuleRegistry } from './ModuleRegistry';
import { ModuleManager } from './ModuleManager';
import { ModuleDiscovery } from './ModuleDiscovery';
import { ModuleLoader } from './ModuleLoader';
import { DependencyResolver } from './DependencyResolver';
import { ModuleMigrationService } from './ModuleMigrationService';
import { PermissionService } from './PermissionService';
import { AdminUiService } from './AdminUiService';
import {
  payableResourceRegistry,
  paymentServiceRegistry,
  legalContentServiceRegistry,
  notificationServiceRegistry,
  printerServiceRegistry,
} from './extension-points';
import {
  SchemaRegistry,
  SettingsService,
  SettingsValidation,
  SettingsCache,
  FormGenerator,
} from './settings';
import { ClubSettingsStore } from './settings/stores/ClubSettingsStore';
import { ModuleSettingsStore } from './settings/stores/ModuleSettingsStore';
import { registerCoreSettings } from '../core/settings/registerCoreSettings';
import { registerCoreAdminMetadata } from '../core/admin/coreAdminMetadata';
import { CoreAdminMetadataRegistry } from './adminUi/CoreAdminMetadataRegistry';
import { TenantContext } from './tenant/TenantContext';
import { sharedTenantContext } from './tenant/sharedTenantContext';
import { PlatformContext } from './tenant/PlatformContext';
import { TenantRepository } from '../repositories/tenantRepository';
import { TenantService } from './tenant/TenantService';
import { TenantResolver } from './tenant/TenantResolver';
import { PlatformSettingsService } from './tenant/PlatformSettingsService';
import { TenantSettingsServiceImpl } from './tenant/TenantSettingsServiceImpl';
import type { TenantSettingsService } from './tenant/TenantSettingsService';
import { config } from '../config';
import { prisma } from '../config/database';
import { createPlatformContextMiddleware, createPlatformPublicMiddleware } from '../middleware/platformContext';
import { createTenantContextMiddleware } from '../middleware/tenantContext';
import { createTenantController } from '../controllers/tenantController';
import { PlatformDashboardService, PlatformMonitoringService } from './PlatformDashboardService';
import { PlatformBackupService } from './backup/PlatformBackupService';
import { PlatformTenantAdminService } from './PlatformTenantAdminService';
import { TenantApplicationService } from './TenantApplicationService';
import { ImpersonationService } from './ImpersonationService';
import { platformDomainService } from './PlatformDomainService';
import { corsPolicy } from '../middleware/corsPolicy';

export const platformContainer = new ServiceContainer();

export const moduleDiscovery = new ModuleDiscovery();
export const moduleLoader = new ModuleLoader();

let bootstrapped = false;

export let eventBusInstance!: EventBus;
export let hookSystemInstance!: HookSystem;
export let featureFlagsInstance!: FeatureFlags;
export let auditServiceInstance!: AuditService;
export let healthServiceInstance!: HealthService;
export let metadataRegistryInstance!: MetadataRegistry;
export let extensionPointRegistryInstance!: ExtensionPointRegistry;
export let moduleRegistryInstance!: ModuleRegistry;
export let moduleManagerInstance!: ModuleManager;
export let featureContextInstance!: ReturnType<typeof createFeatureContext>;
export let dependencyResolverInstance!: DependencyResolver;
export let migrationServiceInstance!: ModuleMigrationService;
export let permissionServiceInstance!: PermissionService;
export let adminUiServiceInstance!: AdminUiService;
export let coreAdminMetadataRegistryInstance!: CoreAdminMetadataRegistry;
export let schemaRegistryInstance!: SchemaRegistry;
export let settingsServiceInstance!: SettingsService;
export let tenantContextInstance!: TenantContext;
export let platformContextInstance!: PlatformContext;
export let tenantServiceInstance!: TenantService;
export let tenantResolverInstance!: TenantResolver;
export let platformSettingsServiceInstance!: PlatformSettingsService;
export let tenantSettingsServiceInstance!: TenantSettingsService;
export let tenantControllerInstance!: ReturnType<typeof createTenantController>;
export let platformDashboardServiceInstance!: PlatformDashboardService;
export let platformMonitoringServiceInstance!: PlatformMonitoringService;
export let platformTenantAdminServiceInstance!: PlatformTenantAdminService;
export let tenantApplicationServiceInstance!: TenantApplicationService;
export let impersonationServiceInstance!: ImpersonationService;
export let platformBackupServiceInstance!: PlatformBackupService;

let tenantInfrastructureInitialized = false;

export function bootstrapPlatform(): void {
  if (bootstrapped) return;

  tenantContextInstance = sharedTenantContext;
  platformContextInstance = new PlatformContext();
  const tenantRepository = new TenantRepository();
  tenantServiceInstance = new TenantService(tenantRepository);
  platformSettingsServiceInstance = new PlatformSettingsService();
  tenantSettingsServiceInstance = new TenantSettingsServiceImpl();
  tenantResolverInstance = new TenantResolver(
    tenantServiceInstance,
    platformContextInstance,
    {
      multiTenantEnabled: config.multiTenant.enabled,
      defaultTenantSlug: config.multiTenant.defaultTenantSlug,
      trustedProxies: config.multiTenant.trustedProxies,
      trustProxyHops: config.multiTenant.trustProxyHops,
    }
  );

  eventBusInstance = new EventBus(tenantContextInstance);
  hookSystemInstance = new HookSystem(eventBusInstance);
  featureFlagsInstance = new FeatureFlags();
  auditServiceInstance = new AuditService();
  healthServiceInstance = new HealthService(featureFlagsInstance, tenantContextInstance);
  metadataRegistryInstance = new MetadataRegistry();
  extensionPointRegistryInstance = new ExtensionPointRegistry();
  moduleRegistryInstance = new ModuleRegistry();
  dependencyResolverInstance = new DependencyResolver(moduleRegistryInstance);
  migrationServiceInstance = new ModuleMigrationService();
  permissionServiceInstance = new PermissionService(moduleRegistryInstance, auditServiceInstance);

  extensionPointRegistryInstance.register(EXTENSION_POINT_NAMES.PAYABLE_RESOURCE, payableResourceRegistry);
  extensionPointRegistryInstance.register(EXTENSION_POINT_NAMES.PAYMENT_SERVICE, paymentServiceRegistry);
  extensionPointRegistryInstance.register(EXTENSION_POINT_NAMES.LEGAL_CONTENT, legalContentServiceRegistry);
  extensionPointRegistryInstance.register(EXTENSION_POINT_NAMES.NOTIFICATION_SERVICE, notificationServiceRegistry);
  extensionPointRegistryInstance.register(EXTENSION_POINT_NAMES.PRINTER_SERVICE, printerServiceRegistry);

  schemaRegistryInstance = new SchemaRegistry();
  settingsServiceInstance = new SettingsService(
    schemaRegistryInstance,
    new SettingsValidation(),
    new SettingsCache(),
    new FormGenerator(),
    [new ClubSettingsStore(), new ModuleSettingsStore()],
    auditServiceInstance,
    hookSystemInstance
  );
  registerCoreSettings(settingsServiceInstance);

  coreAdminMetadataRegistryInstance = new CoreAdminMetadataRegistry();
  registerCoreAdminMetadata(coreAdminMetadataRegistryInstance);

  adminUiServiceInstance = new AdminUiService(
    moduleRegistryInstance,
    metadataRegistryInstance,
    settingsServiceInstance,
    coreAdminMetadataRegistryInstance
  );

  featureContextInstance = createFeatureContext(
    hookSystemInstance,
    featureFlagsInstance,
    auditServiceInstance,
    settingsServiceInstance,
    tenantContextInstance
  );

  tenantControllerInstance = createTenantController(
    tenantServiceInstance,
    tenantContextInstance,
    platformContextInstance,
    tenantResolverInstance
  );

  platformBackupServiceInstance = new PlatformBackupService(auditServiceInstance);
  platformMonitoringServiceInstance = new PlatformMonitoringService();
  platformDashboardServiceInstance = new PlatformDashboardService(
    platformContextInstance,
    platformBackupServiceInstance,
    platformMonitoringServiceInstance
  );
  platformTenantAdminServiceInstance = new PlatformTenantAdminService(
    tenantServiceInstance,
    tenantRepository,
    platformContextInstance,
    auditServiceInstance,
    moduleRegistryInstance,
    tenantResolverInstance
  );
  tenantApplicationServiceInstance = new TenantApplicationService(
    platformContextInstance,
    platformTenantAdminServiceInstance,
    auditServiceInstance
  );
  impersonationServiceInstance = new ImpersonationService(auditServiceInstance);

  moduleRegistryInstance.bindPlatformDeps({
    featureFlags: featureFlagsInstance,
    metadataRegistry: metadataRegistryInstance,
    featureContext: featureContextInstance,
    dependencyResolver: dependencyResolverInstance,
  });

  moduleManagerInstance = new ModuleManager({
    moduleRegistry: moduleRegistryInstance,
    moduleDiscovery,
    moduleLoader,
    migrationService: migrationServiceInstance,
    dependencyResolver: dependencyResolverInstance,
    metadataRegistry: metadataRegistryInstance,
    healthService: healthServiceInstance,
    auditService: auditServiceInstance,
    hookSystem: hookSystemInstance,
    featureFlags: featureFlagsInstance,
    featureContext: featureContextInstance,
    settingsService: settingsServiceInstance,
  });

  platformContainer.registerSingleton(PLATFORM_TOKENS.EventBus, eventBusInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.HookSystem, hookSystemInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.MetadataRegistry, metadataRegistryInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.ExtensionPointRegistry, extensionPointRegistryInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.HealthService, healthServiceInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.AuditService, auditServiceInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.ModuleRegistry, moduleRegistryInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.ModuleManager, moduleManagerInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.FeatureContext, featureContextInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.FeatureFlags, featureFlagsInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.SettingsService, settingsServiceInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.TenantService, tenantServiceInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.TenantContext, tenantContextInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.TenantResolver, tenantResolverInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.PlatformContext, platformContextInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.PlatformSettingsService, platformSettingsServiceInstance);
  platformContainer.registerSingleton(PLATFORM_TOKENS.TenantSettingsService, tenantSettingsServiceInstance);

  bootstrapped = true;
}

export async function initializeTenantInfrastructure(): Promise<void> {
  if (tenantInfrastructureInitialized) return;

  const platformData = await platformSettingsServiceInstance.loadContextData(config.coreVersion);
  const domainConfig = platformDomainService.loadFromEnv();
  const merged = platformDomainService.applyToContext(platformData, domainConfig);
  merged.baseDomain = config.multiTenant.baseDomain;
  if (!merged.allowedDomains.includes('localhost')) {
    merged.allowedDomains = [...merged.allowedDomains, 'localhost'];
  }
  platformContextInstance.initialize(merged);

  await prisma.platformSettings.upsert({
    where: { key: 'platform.version' },
    update: { value: config.coreVersion },
    create: { key: 'platform.version', value: config.coreVersion },
  });

  const networkSettings = await platformSettingsServiceInstance.getNamespace('platform.network');
  const effectiveNetworkSettings = platformDomainService.resolveCorsNetworkSettings(
    networkSettings,
    domainConfig
  );
  corsPolicy.bindFromPlatform(merged, effectiveNetworkSettings);

  if (
    Array.isArray(effectiveNetworkSettings.corsOrigins) &&
    JSON.stringify(effectiveNetworkSettings.corsOrigins) !== JSON.stringify(networkSettings?.corsOrigins)
  ) {
    await prisma.platformSettings.upsert({
      where: { key: 'platform.network.corsOrigins' },
      update: { value: effectiveNetworkSettings.corsOrigins as object },
      create: {
        key: 'platform.network.corsOrigins',
        value: effectiveNetworkSettings.corsOrigins as object,
      },
    });
  }

  const { ensureDefaultTenant } = await import('../core/tenant/ensureDefaultTenant');
  await ensureDefaultTenant();

  const defaultTenant = await tenantServiceInstance.findBySlug(config.multiTenant.defaultTenantSlug);
  if (defaultTenant) {
    const { migrateMultiTenantSchema } = await import('../core/tenant/migrateMultiTenantSchema');
    await migrateMultiTenantSchema(defaultTenant.id);
  }

  const { migratePlatformAdminSchema } = await import('../core/tenant/migratePlatformAdminSchema');
  await migratePlatformAdminSchema();

  const { migrateNotificationTenantSchema } = await import('../core/tenant/migrateNotificationTenantSchema');
  await migrateNotificationTenantSchema();

  const { migratePlatformV21Schema } = await import('../core/tenant/migratePlatformV21Schema');
  await migratePlatformV21Schema();

  const { migratePerformanceSchema } = await import('../core/tenant/migratePerformanceSchema');
  await migratePerformanceSchema();

  const { migrateTenantApplicationSchema } = await import('../core/tenant/migrateTenantApplicationSchema');
  await migrateTenantApplicationSchema();

  if (defaultTenant) {
    const { migrateModulesTenantSchema } = await import('../core/tenant/migrateModulesTenantSchema');
    await migrateModulesTenantSchema(defaultTenant.id);
  }

  const { migratePathRoutingV20 } = await import('../core/tenant/migratePathRoutingV20');
  await migratePathRoutingV20();

  const { ensurePlatformAdmin } = await import('../core/tenant/ensurePlatformAdmin');
  await ensurePlatformAdmin();

  tenantInfrastructureInitialized = true;
}

/** Lädt Plattform-Kontext aus DB/ENV neu (z. B. nach Einstellungsänderung). */
export async function reloadPlatformContextFromSettings(): Promise<void> {
  const platformData = await platformSettingsServiceInstance.loadContextData(config.coreVersion);
  const domainConfig = platformDomainService.loadFromEnv();
  const merged = platformDomainService.applyToContext(platformData, domainConfig);
  merged.baseDomain = config.multiTenant.baseDomain;
  if (!merged.allowedDomains.includes('localhost')) {
    merged.allowedDomains = [...merged.allowedDomains, 'localhost'];
  }
  platformContextInstance.initialize(merged);

  const networkSettings = await platformSettingsServiceInstance.getNamespace('platform.network');
  const effectiveNetworkSettings = platformDomainService.resolveCorsNetworkSettings(
    networkSettings,
    domainConfig
  );
  corsPolicy.bindFromPlatform(merged, effectiveNetworkSettings);
}

export function createTenantMiddlewareStack() {
  return [
    createPlatformContextMiddleware(platformContextInstance),
    createPlatformPublicMiddleware(platformContextInstance),
    createTenantContextMiddleware(
      tenantContextInstance,
      tenantResolverInstance,
      tenantServiceInstance
    ),
  ];
}

bootstrapPlatform();

export const eventBus = eventBusInstance;
export const hookSystem = hookSystemInstance;
export const featureFlags = featureFlagsInstance;
export const auditService = auditServiceInstance;
export const healthService = healthServiceInstance;
export const metadataRegistry = metadataRegistryInstance;
export const extensionPointRegistry = extensionPointRegistryInstance;
export const moduleRegistry = moduleRegistryInstance;
export const moduleManager = moduleManagerInstance;
export const featureContext = featureContextInstance;
export const dependencyResolver = dependencyResolverInstance;
export const migrationService = migrationServiceInstance;
export const permissionService = permissionServiceInstance;
export const adminUiService = adminUiServiceInstance;
export const settingsService = settingsServiceInstance;
export const schemaRegistry = schemaRegistryInstance;
export const tenantContext = tenantContextInstance;
export const platformContext = platformContextInstance;
export const tenantService = tenantServiceInstance;
export const tenantResolver = tenantResolverInstance;
export const platformSettingsService = platformSettingsServiceInstance;
export const tenantSettingsService = tenantSettingsServiceInstance;
export const tenantController = tenantControllerInstance;
export const platformDashboardService = platformDashboardServiceInstance;
export const platformMonitoringService = platformMonitoringServiceInstance;
export const platformTenantAdminService = platformTenantAdminServiceInstance;
export const tenantApplicationService = tenantApplicationServiceInstance;
export const impersonationService = impersonationServiceInstance;
export const platformBackupService = platformBackupServiceInstance;
