/**
 * Tenant-scoped Prisma access policy.
 * Used by scripts/qa/tenant-prisma-guard.ts and documented in ADR 040.
 */

/** Models that MUST be tenant-scoped (tenantId / tenantWhere) */
export const TENANT_SCOPED_MODELS = [
  'user',
  'userSession',
  'event',
  'foodItem',
  'order',
  'orderStatus',
  'dailyOrderCounter',
  'customer',
  'clubSettings',
  'tenantModule',
  'tenantSettings',
  'legalPage',
  'authLoginToken',
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

/**
 * Repository layer – canonical Prisma access for tenant data.
 */
export const ALLOWLIST_REPOSITORIES = [
  'backend/src/repositories/index.ts',
  'backend/src/repositories/orderStats.ts',
  'backend/src/repositories/clubRepository.ts',
  'backend/src/repositories/tenantModuleRepository.ts',
  'backend/modules/payment/repositories/paymentRepository.ts',
  'backend/modules/payment/repositories/paymentAdminRepository.ts',
  'backend/modules/payment/repositories/paymentAuditRepository.ts',
  'backend/modules/notifications/repositories/notificationDeliveryRepository.ts',
  'backend/modules/legal/services/LegalPageService.ts',
] as const;

/**
 * Platform administration – cross-tenant access with explicit tenantId in queries.
 */
export const ALLOWLIST_PLATFORM = [
  'backend/src/platform/PlatformTenantAdminService.ts',
  'backend/src/platform/PlatformDashboardService.ts',
  'backend/src/platform/ImpersonationService.ts',
  'backend/src/platform/TenantOnboardingService.ts',
  'backend/src/platform/backup/TenantBackupService.ts',
  'backend/src/platform/tenant/TenantSettingsServiceImpl.ts',
  'backend/src/services/tenantSetupService.ts',
] as const;

/**
 * Services/middleware with direct Prisma – must import tenantScope helpers.
 */
export const ALLOWLIST_SCOPED_SERVICES = [
  'backend/src/services/realtimeSyncService.ts',
  'backend/src/services/authLoginTokenService.ts',
  'backend/src/services/sessionService.ts',
] as const;

/**
 * Bootstrap, seed, migrations – not request-scoped.
 */
export const ALLOWLIST_INFRASTRUCTURE = [
  'backend/prisma/seed.ts',
  'backend/src/config/database.ts',
  'backend/src/core/tenant/ensureDefaultTenant.ts',
  'backend/src/core/tenant/migrateMultiTenantSchema.ts',
  'backend/src/core/tenant/migrateModulesTenantSchema.ts',
  'backend/src/core/tenant/migrateNotificationTenantSchema.ts',
  'backend/src/core/tenant/migratePerformanceSchema.ts',
  'backend/src/core/tenant/migratePlatformAdminSchema.ts',
  'backend/src/core/tenant/migratePlatformV21Schema.ts',
  'backend/src/core/tenant/migrateTenantApplicationSchema.ts',
  'backend/src/core/tenant/ensurePlatformAdmin.ts',
  'backend/src/core/roles/ensureSystemRoles.ts',
] as const;

export const ALLOWLIST_ALL = [
  ...ALLOWLIST_REPOSITORIES,
  ...ALLOWLIST_PLATFORM,
  ...ALLOWLIST_SCOPED_SERVICES,
  ...ALLOWLIST_INFRASTRUCTURE,
] as const;

/** Required import markers for scoped-service allowlist */
export const SCOPED_SERVICE_MARKERS = [
  'tenantWhere',
  'requireTenantId',
  'withTenantId',
  'assertTenantOwnership',
] as const;

export const SCAN_GLOBS = ['backend/src', 'backend/modules'] as const;

export const SCAN_IGNORE = [
  /\.test\.ts$/,
  /\.d\.ts$/,
  /\/qa\//,
] as const;
