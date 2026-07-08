export { BaseModule } from './Module';
export type {
  Module,
  ModuleInfo,
  ModuleConfigContract,
  ModuleWidget,
  ModuleMenuItem,
  ModulePermissionDefinition,
  ModuleRouteRegistration,
  ModuleHealthCheckResult,
  ModuleFeatureFlags,
  CoreHookName,
  HookSubscription,
  FeatureContext,
} from './types';
export { CORE_HOOKS, compareVersions } from './types';
export type { ModuleStatus, ModuleManifest } from './manifest';
export { MODULE_STATUS_LABELS, moduleManifestSchema } from './manifest';
export { moduleDiscovery } from './ModuleDiscovery';
export { moduleLoader } from './ModuleLoader';
export { dependencyResolver } from './DependencyResolver';
export { deriveModuleStatus } from './ModuleRegistry';
export { featureHooks } from './FeatureHooks';
export { featureFlags } from './FeatureFlags';
export { featureContext } from './FeatureContext';
export { moduleRegistry } from './ModuleRegistry';
export { moduleManager } from './ModuleManager';
export {
  payableResourceRegistry,
  paymentServiceRegistry,
} from './extension-points';
export type {
  PayableResource,
  PayableResourceAdapter,
  PaymentService,
  PaymentCheckoutResult,
} from './extension-points';
