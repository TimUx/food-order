import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/platform/bootstrap', () => ({
  tenantContext: { current: vi.fn() },
  platformContext: { current: vi.fn() },
}));

vi.mock('../../../src/config', () => ({
  config: {
    corsOrigin: 'http://localhost:5173',
    nodeEnv: 'development',
    multiTenant: { baseDomain: 'festmanager.test' },
  },
}));

import { tenantContext, platformContext } from '../../../src/platform/bootstrap';
import { resolveTenantPublicBaseUrl } from './notificationTenantContext';

describe('notificationTenantContext', () => {
  beforeEach(() => {
    vi.mocked(tenantContext.current).mockReset();
    vi.mocked(platformContext.current).mockReset();
  });

  it('builds subdomain URL in production-like setup', () => {
    vi.mocked(tenantContext.current).mockReturnValue({ subdomain: 'feuerwehr', slug: 'feuerwehr' } as never);
    vi.mocked(platformContext.current).mockReturnValue({ baseDomain: 'festmanager.test' } as never);

    expect(resolveTenantPublicBaseUrl()).toBe('http://feuerwehr.festmanager.test');
  });

  it('builds path-prefix URL when enabled', () => {
    vi.mocked(tenantContext.current).mockReturnValue({ slug: 'feuerwehr' } as never);
    vi.mocked(platformContext.current).mockReturnValue({
      baseDomain: 'localhost',
      pathPrefixRoutingEnabled: true,
    } as never);

    expect(resolveTenantPublicBaseUrl()).toBe('http://localhost:5173/feuerwehr');
  });

  it('falls back to corsOrigin without tenant context', () => {
    vi.mocked(tenantContext.current).mockReturnValue(undefined);
    vi.mocked(platformContext.current).mockReturnValue(undefined);

    expect(resolveTenantPublicBaseUrl()).toBe('http://localhost:5173');
  });
});
