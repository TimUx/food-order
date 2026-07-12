import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/platform/bootstrap', () => ({
  tenantContext: { current: vi.fn() },
  platformContext: { current: vi.fn() },
}));

vi.mock('../../../src/config', () => ({
  config: {
    corsOrigin: 'http://localhost:5173',
    nodeEnv: 'development',
    multiTenant: { baseDomain: 'festschmiede.test' },
  },
}));

import { tenantContext, platformContext } from '../../../src/platform/bootstrap';
import { resolveTenantPublicBaseUrl } from './notificationTenantContext';

describe('notificationTenantContext', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.mocked(tenantContext.current).mockReset();
    vi.mocked(platformContext.current).mockReset();
    process.env = { ...envBackup };
    delete process.env.PLATFORM_DOMAIN;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('builds path-based tenant URL on app host', () => {
    process.env.PLATFORM_DOMAIN = 'festschmiede.test';
    process.env.NODE_ENV = 'production';
    vi.mocked(tenantContext.current).mockReturnValue({ subdomain: 'feuerwehr', slug: 'feuerwehr' } as never);
    vi.mocked(platformContext.current).mockReturnValue({
      baseDomain: 'festschmiede.test',
      appDomain: 'app.festschmiede.test',
      pathPrefixRoutingEnabled: true,
    } as never);

    expect(resolveTenantPublicBaseUrl()).toBe('https://app.festschmiede.test/feuerwehr');
  });

  it('builds local path-prefix URL', () => {
    vi.mocked(tenantContext.current).mockReturnValue({ slug: 'feuerwehr' } as never);
    vi.mocked(platformContext.current).mockReturnValue({
      baseDomain: 'localhost',
      pathPrefixRoutingEnabled: true,
    } as never);

    expect(resolveTenantPublicBaseUrl()).toBe('http://localhost:5173/feuerwehr');
  });

  it('falls back to app URL without tenant context', () => {
    vi.mocked(tenantContext.current).mockReturnValue(undefined);
    vi.mocked(platformContext.current).mockReturnValue(undefined);

    expect(resolveTenantPublicBaseUrl()).toBe('http://localhost:5173');
  });
});
