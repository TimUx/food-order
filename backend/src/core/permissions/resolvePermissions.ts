import { parsePermissionKeys } from '../../platform/permissions';
import { DELEGATED_ADMIN_PERMISSIONS } from './corePermissions';

export function resolveUserPermissions(user: {
  permissions?: unknown;
  role: { permissions?: unknown };
}): string[] {
  const userPerms = parsePermissionKeys(user.permissions);
  if (userPerms.length > 0) return userPerms;
  return parsePermissionKeys(user.role.permissions);
}

export function hasDelegatedAdminAccess(role: string, permissions: string[]): boolean {
  if (role === 'ADMIN') return true;
  return permissions.some((p) => DELEGATED_ADMIN_PERMISSIONS.has(p));
}
