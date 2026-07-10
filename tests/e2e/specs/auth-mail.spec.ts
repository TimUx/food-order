import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
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
