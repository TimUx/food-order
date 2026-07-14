import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const artifactsDir = path.resolve(__dirname, '../../artifacts/playwright');

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Nutzerreise ist serial; Smoke-Tests (qa:e2e) profitieren von mehreren Workern.
  workers: process.env.PLAYWRIGHT_WORKERS
    ? Number(process.env.PLAYWRIGHT_WORKERS)
    : process.env.CI
      ? 2
      : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(artifactsDir, 'html'), open: 'never' }],
    ['junit', { outputFile: path.join(artifactsDir, 'junit.xml') }],
  ],
  outputDir: path.join(artifactsDir, 'test-results'),
  use: {
    baseURL: process.env.QA_FRONTEND_BASE || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
