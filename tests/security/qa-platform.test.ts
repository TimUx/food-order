import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

test('security audit script exists', () => {
  const script = path.join(root, 'scripts/qa/security-audit.ts');
  expect(fs.existsSync(script)).toBe(true);
});

test('QA artifacts directory is gitignored', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  expect(gitignore).toContain('artifacts/');
});

test('production CORS validation module exists', () => {
  const corsPolicy = path.join(root, 'backend/src/middleware/corsPolicy.ts');
  const content = fs.readFileSync(corsPolicy, 'utf8');
  expect(content).toContain('validateProductionConfig');
});

test('security headers middleware exists', () => {
  const file = path.join(root, 'backend/src/middleware/securityHeaders.ts');
  expect(fs.existsSync(file)).toBe(true);
});

test('.env.example does not use CORS wildcard', () => {
  const example = path.join(root, '.env.example');
  const content = fs.readFileSync(example, 'utf8');
  expect(content).not.toMatch(/CORS_ORIGIN=\*/);
});

test('upload guards include Content-Length check', () => {
  const file = path.join(root, 'backend/src/middleware/uploadGuards.ts');
  const content = fs.readFileSync(file, 'utf8');
  expect(content).toContain('assertUploadContentLength');
  expect(content).toContain('UPLOAD_AV_HOOK');
});
