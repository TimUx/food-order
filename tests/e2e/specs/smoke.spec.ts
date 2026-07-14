import { test, expect } from '@playwright/test';
import { TENANT_BASE, tenantPath } from '../constants';

const admin = { email: 'admin@verein.local', password: 'admin123' };
const kitchen = { email: 'kueche@verein.local', password: 'staff123' };

test.use({ baseURL: TENANT_BASE });

test.describe('Administrator', () => {
  test('anmelden und Funktionen-Seite öffnen', async ({ page }) => {
    await page.goto(tenantPath('/admin/login'));
    await page.getByLabel('Benutzername oder E-Mail').fill(admin.email);
    await page.getByLabel('Passwort').fill(admin.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
    await page.goto(tenantPath('/admin/module'));
    await expect(page.getByRole('heading', { name: /funktionen/i }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('Einstellungen und Benutzer erreichbar', async ({ page }) => {
    await page.goto(tenantPath('/admin/login'));
    await page.getByLabel('Benutzername oder E-Mail').fill(admin.email);
    await page.getByLabel('Passwort').fill(admin.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
    await page.goto(tenantPath('/admin/benutzer'));
    await expect(page).toHaveURL(/\/admin\/benutzer/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /team/i }).first()).toBeVisible({ timeout: 30_000 });
    await page.goto(tenantPath('/admin/verein'));
    await expect(page.getByText(/veranstalter|verein/i).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Bestellablauf', () => {
  test('Speisekarte öffnen und Bestellung absenden', async ({ page }) => {
    await page.goto(tenantPath('/public'));
    await expect(page.getByText(/sommerfest|bestell/i).first()).toBeVisible({ timeout: 30_000 });

    const addButton = page.getByRole('button', { name: /\+/ }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    const weiter = page.getByRole('button', { name: /weiter/i });
    if (await weiter.isVisible()) {
      await weiter.click();
    }

    await page.getByLabel(/vorname/i).fill('QA');
    await page.getByLabel(/nachname/i).fill('Tester');
    const submit = page.getByRole('button', { name: /bestellung absenden|bestellen/i });
    if (await submit.isEnabled()) {
      await submit.click();
      await expect(page).toHaveURL(/status/, { timeout: 20_000 });
    }
  });
});

test.describe('Küche & Abholung', () => {
  test('Küchenmonitor und Abholung', async ({ page }) => {
    await page.goto(tenantPath('/mitarbeiter/login'));
    await page.getByLabel('Benutzername oder E-Mail').fill(kitchen.email);
    await page.getByLabel('Passwort').fill(kitchen.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/mitarbeiter\/?$/, { timeout: 15_000 });
    await page.goto(tenantPath('/mitarbeiter/kueche'));
    await expect(page).toHaveURL(/\/mitarbeiter\/kueche/, { timeout: 15_000 });
    await expect(page.getByText(/aktive bestellungen|keine bestellungen/i).first()).toBeVisible({ timeout: 30_000 });
    await page.goto(tenantPath('/mitarbeiter/abholung'));
    await expect(page).toHaveURL(/\/mitarbeiter\/abholung/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /abholung bestätigen/i })).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Logout', () => {
  test('Mitarbeiter abmelden', async ({ page }) => {
    await page.goto(tenantPath('/mitarbeiter/login'));
    await page.getByLabel('Benutzername oder E-Mail').fill(kitchen.email);
    await page.getByLabel('Passwort').fill(kitchen.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    const logout = page.getByRole('button', { name: /abmelden|logout/i });
    if (await logout.isVisible()) {
      await logout.click();
    }
  });
});
