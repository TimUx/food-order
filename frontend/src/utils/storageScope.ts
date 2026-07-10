import type { RoutingScope } from '@/types/routing';

export function scopedStorageKey(
  baseKey: string,
  scope: RoutingScope,
  tenantSlug?: string | null
): string {
  if (scope === 'tenant' && tenantSlug) {
    return `${baseKey}:${tenantSlug}`;
  }
  return baseKey;
}

export function readScopedItem(
  baseKey: string,
  scope: RoutingScope,
  tenantSlug?: string | null
): string | null {
  return localStorage.getItem(scopedStorageKey(baseKey, scope, tenantSlug));
}

export function writeScopedItem(
  baseKey: string,
  scope: RoutingScope,
  tenantSlug: string | null | undefined,
  value: string
): void {
  localStorage.setItem(scopedStorageKey(baseKey, scope, tenantSlug), value);
}

export function removeScopedItem(
  baseKey: string,
  scope: RoutingScope,
  tenantSlug?: string | null
): void {
  localStorage.removeItem(scopedStorageKey(baseKey, scope, tenantSlug));
}
