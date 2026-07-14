import { describe, it, expect } from 'vitest';
import { resolveUserPermissions } from './resolvePermissions';

describe('resolveUserPermissions', () => {
  const staffRole = { permissions: [] };

  it('leitet Berechtigungen aus mehreren Rollenvorlagen ab', () => {
    const permissions = resolveUserPermissions({
      permissions: ['payment.view'],
      roleTemplates: ['abholung', 'kasse', 'finanzen'],
      role: staffRole,
    });

    expect(permissions).toContain('orders.view');
    expect(permissions).toContain('orders.pickup');
    expect(permissions).toContain('orders.manage');
    expect(permissions).toContain('payment.statistics');
  });

  it('nutzt gespeicherte Berechtigungen ohne Rollenvorlagen', () => {
    const permissions = resolveUserPermissions({
      permissions: ['orders.view', 'orders.manage'],
      role: staffRole,
    });

    expect(permissions).toEqual(['orders.view', 'orders.manage']);
  });

  it('fällt auf Rollen-Berechtigungen zurück', () => {
    const permissions = resolveUserPermissions({
      role: { permissions: ['orders.kitchen'] },
    });

    expect(permissions).toEqual(['orders.kitchen']);
  });
});
