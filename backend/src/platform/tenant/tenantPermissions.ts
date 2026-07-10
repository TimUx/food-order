/**
 * Vorbereitung tenantfähiger Berechtigungen (Phase 2+).
 * Bestehende Rollen werden in dieser Phase nicht migriert.
 */
export const TENANT_PERMISSION_SCOPES = {
  PLATFORM: 'platform',
  TENANT: 'tenant',
} as const;

export type TenantPermissionScope =
  (typeof TENANT_PERMISSION_SCOPES)[keyof typeof TENANT_PERMISSION_SCOPES];

export interface TenantScopedPermission {
  key: string;
  scope: TenantPermissionScope;
  tenantId?: string;
  description: string;
}

export const PLATFORM_PERMISSIONS = {
  TENANTS_MANAGE: 'platform.tenants.manage',
  SETTINGS_MANAGE: 'platform.settings.manage',
  USERS_MANAGE: 'platform.users.manage',
  SYSTEM_VIEW: 'platform.system.view',
} as const;

export function isPlatformPermission(permissionKey: string): boolean {
  return permissionKey.startsWith('platform.');
}

export function isTenantPermission(permissionKey: string): boolean {
  return !isPlatformPermission(permissionKey);
}

export function permissionAppliesToTenant(
  permissionKey: string,
  tenantId: string,
  userTenantId?: string
): boolean {
  if (isPlatformPermission(permissionKey)) return false;
  return !userTenantId || userTenantId === tenantId;
}
