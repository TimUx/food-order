import { test, expect } from '@playwright/test';
import { TENANT_BASE } from '../constants';

test.describe('Authentication', () => {
  test.use({ baseURL: TENANT_BASE });
  test('login page loads with email field', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByLabel('E-Mail')).toBeVisible();
  });

  test('staff login page loads', async ({ page }) => {
    await page.goto('/mitarbeiter/login');
    await expect(page.getByLabel('E-Mail')).toBeVisible();
  });
});

test.describe('Platform Mail', () => {
  test('platform login page loads', async ({ page }) => {
    await page.goto('/platform/login');
    await expect(page.getByLabel(/E-Mail/i)).toBeVisible();
  });
});
