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

    const increaseQty = page.getByRole('button', { name: /menge erhöhen/i }).first();
    await expect(increaseQty).toBeVisible({ timeout: 15_000 });
    await increaseQty.click();

    const weiter = page.getByRole('button', { name: /^weiter$/i });
    await expect(weiter).toBeEnabled({ timeout: 10_000 });
    await weiter.click();

    await expect(page.getByTestId('order-checkout-step')).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/vorname/i).fill('QA');
    await page.getByLabel(/nachname/i).fill('Tester');

    const submit = page.getByRole('button', { name: /bestellung absenden|bestellen und bezahlen/i });
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.scrollIntoViewIfNeeded();

    // Bot-Schutz verlangt min. 3s seit Formularstart
    await page.waitForTimeout(3500);

    const orderResponse = page.waitForResponse(
      (res) => {
        const url = res.url();
        return res.request().method() === 'POST'
          && url.includes('/public/orders')
          && !url.includes('/lookup')
          && !url.includes('/checkout');
      },
      { timeout: 20_000 }
    );
    await submit.click();
    const response = await orderResponse;
    const responseBody = await response.text();
    expect(response.status(), responseBody).toBe(201);

    await expect(page).toHaveURL(/status/, { timeout: 15_000 });
  });
});

test.describe('Küche & Abholung', () => {
  test('Küchenmonitor und Abholung', async ({ page }) => {
    await page.goto(tenantPath('/service/login'));
    await page.getByLabel('Benutzername oder E-Mail').fill(kitchen.email);
    await page.getByLabel('Passwort').fill(kitchen.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/service\/?$/, { timeout: 15_000 });
    await page.goto(tenantPath('/service/kueche'));
    await expect(page).toHaveURL(/\/service\/kueche/, { timeout: 15_000 });
    await expect(page.getByText(/aktive bestellungen|keine bestellungen/i).first()).toBeVisible({ timeout: 30_000 });
    await page.goto(tenantPath('/service/abholung'));
    await expect(page).toHaveURL(/\/service\/abholung/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /abholung bestätigen/i })).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Logout', () => {
  test('Mitarbeiter abmelden', async ({ page }) => {
    await page.goto(tenantPath('/service/login'));
    await page.getByLabel('Benutzername oder E-Mail').fill(kitchen.email);
    await page.getByLabel('Passwort').fill(kitchen.password);
    await page.getByRole('button', { name: /anmelden/i }).click();
    const logout = page.getByRole('button', { name: /abmelden|logout/i });
    if (await logout.isVisible()) {
      await logout.click();
    }
  });
});
