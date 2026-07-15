export const TENANT_ROLE_TEMPLATE_IDS = [
  'kueche',
  'abholung',
  'kasse',
  'speisenpflege',
  'finanzen',
  'rechtliches',
] as const;

export type TenantRoleTemplateId = (typeof TENANT_ROLE_TEMPLATE_IDS)[number];

export interface TenantRoleTemplate {
  id: TenantRoleTemplateId;
  label: string;
  description: string;
  permissions: string[];
}

export const TENANT_ROLE_TEMPLATES: TenantRoleTemplate[] = [
  {
    id: 'kueche',
    label: 'Küche',
    description: 'Küchenmonitor und Bondruck',
    permissions: ['orders.view', 'orders.kitchen', 'printer.print'],
  },
  {
    id: 'abholung',
    label: 'Abholung',
    description: 'Fertige Bestellungen aushändigen',
    permissions: ['orders.view', 'orders.pickup'],
  },
  {
    id: 'kasse',
    label: 'Kasse',
    description: 'Bestellungen vor Ort aufgeben und Zahlungsstatus einsehen',
    permissions: ['orders.view', 'orders.manage', 'payment.view'],
  },
  {
    id: 'speisenpflege',
    label: 'Speisen & Getränke',
    description: 'Katalog Speisen & Getränke und Veranstaltungen pflegen',
    permissions: ['food.view', 'food.edit', 'events.manage'],
  },
  {
    id: 'finanzen',
    label: 'Finanzen',
    description: 'Zahlungen, Statistiken und Rückerstattungen',
    permissions: ['payment.view', 'payment.statistics', 'payment.refund', 'payment.logs'],
  },
  {
    id: 'rechtliches',
    label: 'Rechtliches',
    description: 'Impressum, Datenschutz und AGB verwalten',
    permissions: ['legal.view', 'legal.manage', 'legal.publish'],
  },
];

export const TENANT_ROLE_TEMPLATE_MAP = Object.fromEntries(
  TENANT_ROLE_TEMPLATES.map((t) => [t.id, t])
) as Record<TenantRoleTemplateId, TenantRoleTemplate>;

export const KUECHE_TEMPLATE_PERMISSIONS = TENANT_ROLE_TEMPLATE_MAP.kueche.permissions;

export function isTenantRoleTemplateId(value: string): value is TenantRoleTemplateId {
  return (TENANT_ROLE_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function parseStoredRoleTemplates(user: {
  roleTemplates?: unknown;
  roleTemplate?: string | null;
}): TenantRoleTemplateId[] {
  if (Array.isArray(user.roleTemplates)) {
    const ids = user.roleTemplates.filter(
      (id): id is TenantRoleTemplateId => typeof id === 'string' && isTenantRoleTemplateId(id)
    );
    if (ids.length > 0) return ids;
  }
  if (user.roleTemplate && isTenantRoleTemplateId(user.roleTemplate)) {
    return [user.roleTemplate];
  }
  return [];
}
