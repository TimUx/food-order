export { Registry } from './Registry';
export { ServiceContainer, PLATFORM_TOKENS } from './ServiceContainer';
export { EventBus } from './EventBus';
export type { EventHandler, EventSubscription } from './EventBus';
export { HookSystem } from './HookSystem';
export { MetadataRegistry } from './MetadataRegistry';
export { ExtensionPointRegistry, EXTENSION_POINT_NAMES } from './ExtensionPointRegistry';
export type { ExtensionPointName } from './ExtensionPointRegistry';
export { HealthService } from './HealthService';
export { AuditService } from './AuditService';
export { FeatureFlags } from './FeatureFlags';
export { createFeatureContext } from './FeatureContext';
export { ModuleRegistry, deriveModuleStatus } from './ModuleRegistry';
export { ModuleDiscovery } from './ModuleDiscovery';
export { ModuleLoader } from './ModuleLoader';
export { DependencyResolver } from './DependencyResolver';
export { ModuleManager } from './ModuleManager';
export type { ModuleManagerDeps } from './ModuleManager';
export { ModuleMigrationService } from './ModuleMigrationService';
export { PermissionService, parsePermissionKeys, userHasPermission } from './permissions';
export { AdminUiService } from './AdminUiService';
export { CoreAdminMetadataRegistry } from './adminUi/CoreAdminMetadataRegistry';
export type { CoreAdminUiMetadata } from './adminUi/CoreAdminMetadataRegistry';
export type {
  AdminUiCatalog,
  AdminPageDefinition,
  AdminNavItem,
  AdminWidgetDefinition,
  AdminHealthDefinition,
  AdminReportDefinition,
  AdminDeveloperPageDefinition,
  AdminDashboardTile,
  AdminPageType,
} from './adminUi/types';
export {
  platformContainer,
  bootstrapPlatform,
  initializeTenantInfrastructure,
  createTenantMiddlewareStack,
  moduleDiscovery,
  moduleLoader,
  eventBus,
  hookSystem,
  metadataRegistry,
  extensionPointRegistry,
  healthService,
  auditService,
  moduleRegistry,
  moduleManager,
  featureContext,
  featureFlags,
  dependencyResolver,
  migrationService,
  permissionService,
  adminUiService,
  settingsService,
  schemaRegistry,
  tenantContext,
  platformContext,
  tenantService,
  tenantResolver,
  platformSettingsService,
  tenantController,
} from './bootstrap';
export {
  BaseModule,
  CORE_HOOKS,
  compareVersions,
} from './types';
export type {
  Module,
  ModuleInfo,
  ModuleConfigContract,
  ModuleWidget,
  ModuleMenuItem,
  ModulePermissionDefinition,
  ModuleRouteRegistration,
  ModuleRouteMetadata,
  ModuleSettingsMetadata,
  ModuleHealthCheckResult,
  ModuleFeatureFlags,
  CoreHookName,
  HookSubscription,
  HookHandler,
  FeatureContext,
  ResolvedModuleMetadata,
  AuditLogEntry,
} from './types';
export type { ModuleStatus, ModuleManifest } from './manifest';
export { MODULE_STATUS_LABELS, moduleManifestSchema, CORE_VERSION } from './manifest';
export {
  payableResourceRegistry,
  paymentServiceRegistry,
} from './extension-points';
export {
  SchemaRegistry,
  SettingsService,
  SettingsValidation,
  SettingsCache,
  FormGenerator,
  encryptValue,
  decryptValue,
  maskValue,
  CORE_CLUB_NAMESPACE,
  CORE_ORDER_NAMESPACE,
  CORE_EMAIL_NAMESPACE,
  moduleSettingsNamespace,
} from './settings';
export type {
  SettingsSchemaDefinition,
  SettingsFormDefinition,
  SettingsFieldMetadata,
  SettingsNamespaceInfo,
} from './settings/types';
export type {
  PayableResource,
  PayableResourceAdapter,
  PaymentService,
  PaymentCheckoutResult,
} from './extension-points';
export {
  QaRegistry,
  ModuleScenarioRunner,
  QaReportBuilder,
} from './qa';
export type {
  ModuleQaContribution,
  ModuleScenario,
  ModuleScenarioResult,
  QaSummaryReport,
  QaReportSection,
} from './qa';
