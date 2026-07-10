export function parsePermissionKeys(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : [];
}

export function userHasPermission(role: string, permissions: string[] | undefined, permissionKey: string): boolean {
  if (role === 'ADMIN') return true;
  return (permissions ?? []).includes(permissionKey);
}

export { PermissionService } from './PermissionService';
