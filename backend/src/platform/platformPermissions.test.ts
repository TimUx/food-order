import { describe, it, expect } from 'vitest';
import {
  hasPlatformPermission,
  PLATFORM_PERMISSIONS,
  ALL_PLATFORM_PERMISSIONS,
  parsePlatformPermissions,
} from './platformPermissions';

describe('platformPermissions', () => {
  it('grants all with platform.*', () => {
    expect(hasPlatformPermission(['platform.*'], PLATFORM_PERMISSIONS.TENANT_DELETE)).toBe(true);
  });

  it('grants tenant.manage for tenant operations', () => {
    expect(hasPlatformPermission([PLATFORM_PERMISSIONS.TENANT_MANAGE], PLATFORM_PERMISSIONS.TENANT_VIEW)).toBe(true);
  });

  it('denies tenant permissions without grant', () => {
    expect(hasPlatformPermission([PLATFORM_PERMISSIONS.LOGS_VIEW], PLATFORM_PERMISSIONS.TENANT_DELETE)).toBe(false);
  });

  it('parses permission array from JSON', () => {
    expect(parsePlatformPermissions(['tenant.view'])).toEqual(['tenant.view']);
  });

  it('defaults to all permissions for invalid input', () => {
    expect(parsePlatformPermissions(null)).toEqual(ALL_PLATFORM_PERMISSIONS);
  });
});
