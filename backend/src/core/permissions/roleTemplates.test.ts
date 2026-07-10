import { describe, it, expect } from 'vitest';
import {
  TENANT_ROLE_TEMPLATES,
  TENANT_ROLE_TEMPLATE_MAP,
  resolveUserPermissions,
  hasDelegatedAdminAccess,
} from './index';

describe('tenant role templates', () => {
  it('defines six fachliche Vorlagen', () => {
    expect(TENANT_ROLE_TEMPLATES).toHaveLength(6);
    expect(TENANT_ROLE_TEMPLATE_MAP.kasse.permissions).toContain('payment.view');
    expect(TENANT_ROLE_TEMPLATE_MAP.kasse.permissions).not.toContain('team.manage');
    expect(TENANT_ROLE_TEMPLATE_MAP.kasse.permissions).not.toContain('payment.settings');
  });

  it('resolves per-user permissions before global role fallback', () => {
    const perms = resolveUserPermissions({
      permissions: ['orders.manage'],
      role: { permissions: ['team.manage'] },
    });
    expect(perms).toEqual(['orders.manage']);
  });

  it('grants delegated admin only with fachlichen Rechten', () => {
    expect(hasDelegatedAdminAccess('STAFF', TENANT_ROLE_TEMPLATE_MAP.kasse.permissions)).toBe(true);
    expect(hasDelegatedAdminAccess('STAFF', TENANT_ROLE_TEMPLATE_MAP.kueche.permissions)).toBe(false);
    expect(hasDelegatedAdminAccess('ADMIN', [])).toBe(true);
  });
});
