import type { User } from '@/types';

const DELEGATED_ADMIN_PERMISSIONS = new Set([
  'team.view',
  'team.manage',
  'food.view',
  'food.edit',
  'events.manage',
  'settings.club',
  'settings.order',
  'payment.view',
  'payment.manage',
  'payment.refund',
  'payment.logs',
  'payment.statistics',
  'payment.provider.configure',
  'payment.webhooks',
  'payment.settings',
  'legal.view',
  'legal.manage',
  'legal.publish',
  'notifications.settings',
  'notifications.send',
  'printer.settings',
]);

export function canAccessPermission(user: User | null, permissionKey?: string): boolean {
  if (!permissionKey) return true;
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return Boolean(user.permissions?.includes(permissionKey));
}

export function hasDelegatedAdminAccess(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return (user.permissions ?? []).some((p) => DELEGATED_ADMIN_PERMISSIONS.has(p));
}
