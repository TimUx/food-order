import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'modules/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../artifacts/coverage',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts', 'modules/**/*.ts'],
      exclude: ['**/*.test.ts', 'dist/**'],
      // Thresholds disabled until broader test coverage is in place (see ADR-011).
    },
  },
});
