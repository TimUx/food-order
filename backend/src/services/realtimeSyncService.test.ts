import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

function buildEtag(parts: (string | number | null | undefined)[]): string {
  return createHash('sha256')
    .update(parts.map((p) => String(p ?? '')).join('|'))
    .digest('hex')
    .slice(0, 16);
}

describe('realtime etag', () => {
  it('produces stable etag for same inputs', () => {
    const a = buildEtag(['orders', 'evt-1', 'NEW', 5, '2026-07-09T10:00:00.000Z']);
    const b = buildEtag(['orders', 'evt-1', 'NEW', 5, '2026-07-09T10:00:00.000Z']);
    expect(a).toBe(b);
  });

  it('changes when count changes', () => {
    const a = buildEtag(['orders', 'evt-1', '', 5, '2026-07-09T10:00:00.000Z']);
    const b = buildEtag(['orders', 'evt-1', '', 6, '2026-07-09T10:00:00.000Z']);
    expect(a).not.toBe(b);
  });
});
