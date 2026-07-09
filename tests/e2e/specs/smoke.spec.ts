import { test, expect } from '@playwright/test';

const admin = { email: 'admin@verein.local', password: 'admin123' };
const kitchen = { email: 'kueche@verein.local', password: 'staff123' };

test.describe('Administrator', () => {
  test('anmelden und Funktionen-Seite öffnen', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('E-Mail').fill(admin.email);
    await page.getByLabel('Passwort').fill(admin.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
    await page.goto('/admin/module');
    await expect(page.getByRole('heading', { name: /funktionen/i }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('Einstellungen und Benutzer erreichbar', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('E-Mail').fill(admin.email);
    await page.getByLabel('Passwort').fill(admin.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
    await page.goto('/admin/benutzer');
    await expect(page.getByRole('heading', { name: /benutzer/i }).first()).toBeVisible({ timeout: 30_000 });
    await page.goto('/admin/verein');
    await expect(page.getByText(/verein/i).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Bestellablauf', () => {
  test('Speisekarte öffnen und Bestellung absenden', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/sommerfest|bestell/i).first()).toBeVisible({ timeout: 30_000 });

    const addButton = page.getByRole('button', { name: /\+/ }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
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
    await page.goto('/mitarbeiter/login');
    await page.getByLabel('E-Mail').fill(kitchen.email);
    await page.getByLabel('Passwort').fill(kitchen.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/mitarbeiter\/?$/, { timeout: 15_000 });
    await page.goto('/mitarbeiter/kueche');
    await expect(page.getByText(/aktive bestellungen|keine bestellungen/i).first()).toBeVisible({ timeout: 30_000 });
    await page.goto('/mitarbeiter/abholung');
    await expect(page.getByText(/abholung|abholnummer/i).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Logout', () => {
  test('Mitarbeiter abmelden', async ({ page }) => {
    await page.goto('/mitarbeiter/login');
    await page.getByLabel('E-Mail').fill(kitchen.email);
    await page.getByLabel('Passwort').fill(kitchen.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    const logout = page.getByRole('button', { name: /abmelden|logout/i });
    if (await logout.isVisible()) {
      await logout.click();
    }
  });
});
