import { describe, it, expect } from 'vitest';
import { STATUS_LABELS } from '@/types';

describe('types', () => {
  it('enthält deutsche Statuslabels', () => {
    expect(STATUS_LABELS.NEW).toBe('Neu');
    expect(STATUS_LABELS.READY).toBe('Fertig');
    expect(STATUS_LABELS.PICKED_UP).toBe('Abgeholt');
  });
});
