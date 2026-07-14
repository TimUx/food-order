import { parsePermissionKeys } from '../../platform/permissions';
import { DELEGATED_ADMIN_PERMISSIONS } from './corePermissions';
import { parseStoredRoleTemplates, TENANT_ROLE_TEMPLATE_MAP } from './roleTemplates';

function permissionsFromRoleTemplates(user: {
  roleTemplates?: unknown;
  roleTemplate?: string | null;
}): string[] {
  const templateIds = parseStoredRoleTemplates(user);
  if (templateIds.length === 0) return [];

  const merged = templateIds.flatMap((id) => TENANT_ROLE_TEMPLATE_MAP[id]?.permissions ?? []);
  return [...new Set(merged)];
}

export function resolveUserPermissions(user: {
  permissions?: unknown;
  role: { permissions?: unknown };
  roleTemplates?: unknown;
  roleTemplate?: string | null;
}): string[] {
  const fromTemplates = permissionsFromRoleTemplates(user);
  if (fromTemplates.length > 0) return fromTemplates;

  const userPerms = parsePermissionKeys(user.permissions);
  if (userPerms.length > 0) return userPerms;
  return parsePermissionKeys(user.role.permissions);
}

export function hasDelegatedAdminAccess(role: string, permissions: string[]): boolean {
  if (role === 'ADMIN') return true;
  return permissions.some((p) => DELEGATED_ADMIN_PERMISSIONS.has(p));
}
