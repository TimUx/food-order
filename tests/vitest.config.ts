import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    globals: true,
    environment: 'node',
    env: {
      MULTI_TENANT_ENABLED: 'true',
      PLATFORM_BASE_DOMAIN: 'localhost',
      PLATFORM_DOMAIN: 'localhost',
      QA_TENANT_SLUG: 'default',
      TRUSTED_PROXY_HOPS: '1',
    },
    include: ['tests/api/**/*.test.ts', 'tests/integration/**/*.test.ts', 'tests/module/**/*.test.ts', 'tests/security/**/*.test.ts', 'tests/performance/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    reporters: ['default', 'junit'],
    outputFile: { junit: 'artifacts/junit-api.xml' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../backend/src'),
    },
  },
});
