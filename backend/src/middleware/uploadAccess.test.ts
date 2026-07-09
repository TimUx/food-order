import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createUploadAccessMiddleware } from './uploadAccess';

vi.mock('../platform/bootstrap', () => ({
  tenantContext: { id: vi.fn() },
}));

import { tenantContext } from '../platform/bootstrap';

describe('uploadAccess', () => {
  beforeEach(() => {
    vi.mocked(tenantContext.id).mockReset();
  });

  it('denies cross-tenant file access', () => {
    vi.mocked(tenantContext.id).mockReturnValue('tenant-a');

    const middleware = createUploadAccessMiddleware();
    const req = { path: '/tenant-b/logo.jpg' } as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('rejects path traversal in filename', () => {
    vi.mocked(tenantContext.id).mockReturnValue('tenant-a');

    const middleware = createUploadAccessMiddleware();
    const req = { path: '/tenant-a/../etc/passwd' } as Request;
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
