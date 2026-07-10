import { describe, it, expect, vi } from 'vitest';
import { assertUploadContentLength, UPLOAD_MAX_BYTES } from './uploadGuards';
import { AppError } from './errorHandler';

describe('uploadGuards', () => {
  it('rejects Content-Length above limit', () => {
    const next = vi.fn();
    const middleware = assertUploadContentLength();
    middleware(
      { headers: { 'content-length': String(UPLOAD_MAX_BYTES + 1) } },
      {},
      next
    );
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(413);
  });

  it('allows missing Content-Length', () => {
    const next = vi.fn();
    assertUploadContentLength()({ headers: {} }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
});
