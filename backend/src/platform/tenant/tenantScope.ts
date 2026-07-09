import { tenantContext } from '../bootstrap';
import { TenantContextMissingError } from './errors';

/**
 * Liefert die aktuelle Mandanten-ID aus dem TenantContext.
 * Wirft, wenn kein Mandant gesetzt ist.
 */
export function requireTenantId(): string {
  const id = tenantContext.id();
  if (!id) {
    throw new TenantContextMissingError();
  }
  return id;
}

/**
 * Ergänzt eine WHERE-Klausel um tenantId aus dem aktuellen Kontext.
 */
export function tenantWhere<T extends Record<string, unknown>>(
  where: T = {} as T
): T & { tenantId: string } {
  return { ...where, tenantId: requireTenantId() };
}

/**
 * Ergänzt Create-Daten um tenantId aus dem aktuellen Kontext.
 */
export function withTenantId<T extends Record<string, unknown>>(
  data: T
): T & { tenantId: string } {
  return { ...data, tenantId: requireTenantId() };
}

/**
 * Optionale Mandanten-ID (z. B. für Logging ohne Pflicht-Kontext).
 */
export function optionalTenantId(): string | undefined {
  return tenantContext.id();
}

/**
 * Prüft, ob eine Entität zum aktuellen Mandanten gehört.
 */
export function assertTenantOwnership(entityTenantId: string | null | undefined): void {
  const current = requireTenantId();
  if (!entityTenantId || entityTenantId !== current) {
    throw new TenantContextMissingError('Der Datensatz gehört nicht zum aktuellen Veranstalter.');
  }
}
