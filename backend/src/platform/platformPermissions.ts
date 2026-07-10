/**
 * Plattform-Berechtigungen (Phase 3).
 * Plattformadministratoren besitzen platform.* und tenant.* Rechte.
 */
export const PLATFORM_PERMISSIONS = {
  // Wildcard
  ALL: 'platform.*',

  // Mandanten
  TENANT_VIEW: 'tenant.view',
  TENANT_MANAGE: 'tenant.manage',
  TENANT_CREATE: 'tenant.create',
  TENANT_UPDATE: 'tenant.update',
  TENANT_DELETE: 'tenant.delete',
  TENANT_IMPERSONATE: 'tenant.impersonate',

  // Plattform
  SETTINGS_PLATFORM: 'settings.platform',
  SYSTEM_MANAGE: 'system.manage',
  USERS_MANAGE: 'platform.users.manage',
  LOGS_VIEW: 'platform.logs.view',
  MONITORING_VIEW: 'platform.monitoring.view',
  BACKUPS_VIEW: 'platform.backups.view',
} as const;

export const ALL_PLATFORM_PERMISSIONS: string[] = Object.values(PLATFORM_PERMISSIONS);

export function isPlatformPermission(key: string): boolean {
  return key.startsWith('platform.') || key.startsWith('tenant.') || key.startsWith('settings.platform') || key === 'system.manage';
}

export function hasPlatformPermission(
  userPermissions: string[],
  required: string
): boolean {
  if (userPermissions.includes(PLATFORM_PERMISSIONS.ALL)) return true;
  if (userPermissions.includes(required)) return true;
  const [ns] = required.split('.');
  if (userPermissions.includes(`${ns}.*`)) return true;
  if (required.startsWith('tenant.') && userPermissions.includes(PLATFORM_PERMISSIONS.TENANT_MANAGE)) {
    return true;
  }
  return false;
}

export function parsePlatformPermissions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...ALL_PLATFORM_PERMISSIONS];
  return raw.filter((item): item is string => typeof item === 'string');
}
