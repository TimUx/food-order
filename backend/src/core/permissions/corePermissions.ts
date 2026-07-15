import type { ModulePermissionDefinition } from '../../platform/types';

/** Core platform permissions (not module-scoped). */
export const CORE_PERMISSION_DEFINITIONS: ModulePermissionDefinition[] = [
  { key: 'team.view', description: 'Team einsehen' },
  { key: 'team.manage', description: 'Team verwalten' },
  { key: 'food.view', description: 'Speisen & Getränke einsehen' },
  { key: 'food.edit', description: 'Speisen & Getränke bearbeiten' },
  { key: 'events.manage', description: 'Veranstaltungen verwalten' },
  { key: 'orders.view', description: 'Bestellungen einsehen' },
  { key: 'orders.manage', description: 'Bestellungen bearbeiten (Kasse)' },
  { key: 'orders.kitchen', description: 'Küchenmonitor nutzen' },
  { key: 'orders.pickup', description: 'Abholung bestätigen' },
  { key: 'settings.club', description: 'Veranstalter-Einstellungen' },
  { key: 'settings.order', description: 'Bestell-Einstellungen' },
];

export const CORE_PERMISSION_KEYS = new Set(CORE_PERMISSION_DEFINITIONS.map((p) => p.key));

/** Permissions that grant access to the admin area (not mitarbeiter-only). */
export const DELEGATED_ADMIN_PERMISSIONS = new Set([
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
