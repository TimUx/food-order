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

export function bootstrapPlatform(): void {
  if (bootstrapped) return;

  eventBusInstance = new EventBus();
  hookSystemInstance = new HookSystem(eventBusInstance);
  featureFlagsInstance = new FeatureFlags();
  auditServiceInstance = new AuditService();
  healthServiceInstance = new HealthService(featureFlagsInstance);
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
    settingsServiceInstance
  );

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

  bootstrapped = true;
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
