import { tenantModuleRepository } from '../../repositories/tenantModuleRepository';
import { optionalTenantId } from './tenantScope';

/**
 * Prüft, ob ein Modul für den aktuellen Mandanten installiert und aktiviert ist.
 * Module und Hooks nutzen diese Hilfe – sie kennen keine tenant_id direkt.
 */
export async function isModuleEnabledForCurrentTenant(moduleId: string): Promise<boolean> {
  if (!optionalTenantId()) return false;
  try {
    const row = await tenantModuleRepository.findUnique(moduleId);
    return Boolean(row?.installed && row?.enabled);
  } catch {
    return false;
  }
}

/**
 * Erzeugt einen mandantenbezogenen Cache-Schlüssel.
 */
export function tenantCacheKey(namespace: string, tenantId?: string): string {
  const id = tenantId ?? optionalTenantId();
  if (!id) return namespace;
  return `${id}:${namespace}`;
}
