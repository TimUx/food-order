import { test, expect, type Page } from '@playwright/test';
import { TENANT_BASE } from '../constants';

const admin = { email: 'admin@verein.local', password: 'admin123' };

test.use({ baseURL: TENANT_BASE });

function drawerLink(page: Page, name: string) {
  return page.locator('.MuiDrawer-paper').getByRole('link', { name, exact: true });
}

async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('E-Mail').fill(admin.email);
  await page.getByLabel('Passwort').fill(admin.password);
  await page.getByRole('button', { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

test.describe('Admin-Navigation (Volunteer-first)', () => {
  test('Einstellungen zeigen Veranstalter, Bestellung und Benachrichtigungen', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText('Einstellungen').first()).toBeVisible({ timeout: 15_000 });
    await expect(drawerLink(page, 'Veranstalter')).toBeVisible();
    await expect(drawerLink(page, 'Bestellung')).toBeVisible();
    await expect(drawerLink(page, 'Benachrichtigungen')).toBeVisible();
  });

  test('Funktionen ohne Version-Spalte, Team statt Benutzer', async ({ page }) => {
    await loginAsAdmin(page);
    await drawerLink(page, 'Team').click();
    await expect(page.getByRole('heading', { name: /^team$/i }).first()).toBeVisible({ timeout: 15_000 });
    await drawerLink(page, 'Funktionen').click();
    await expect(page.getByRole('heading', { name: /funktionen/i }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Version' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Funktion' })).toBeVisible();
  });

  test('Technische Details unter Erweitert auf der Übersicht', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText('Erweitert').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Funktionsstatus')).toHaveCount(0);
    await page.getByText('Erweitert').first().click();
    await expect(page.getByText(/funktionsstatus|echtzeit/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
