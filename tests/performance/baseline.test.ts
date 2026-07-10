import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

test('performance baseline script exists', () => {
  const script = path.resolve(__dirname, '../../scripts/qa/performance-baseline.ts');
  expect(fs.existsSync(script)).toBe(true);
});

test('k6 load test script exists', () => {
  const script = path.resolve(__dirname, '../../scripts/qa/load-test.k6.js');
  expect(fs.existsSync(script)).toBe(true);
});
