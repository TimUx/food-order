import { expect, type Page } from '@playwright/test';

export const PLATFORM_ADMIN = {
  email: process.env.QA_PLATFORM_ADMIN_EMAIL || 'platform@festschmiede.local',
  password: process.env.QA_PLATFORM_ADMIN_PASSWORD || 'qa-docker-ci-platform-admin-password',
};

export const STAFF_PASSWORD = 'staff123';

export function journeySlug(): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `qa-journey-${suffix}`;
}

export function tenantBase(slug: string): string {
  const root = process.env.QA_FRONTEND_BASE || 'http://localhost:5173';
  return `${root}/${slug}/`;
}

export function tenantRoute(slug: string, route: string): string {
  const path = route.startsWith('/') ? route.slice(1) : route;
  return `${tenantBase(slug)}${path}`;
}

export async function loginPlatformAdmin(page: Page): Promise<void> {
  await page.goto('/platform/login');
  await page.getByLabel('Benutzername oder E-Mail').fill(PLATFORM_ADMIN.email);
  await page.getByLabel('Passwort').fill(PLATFORM_ADMIN.password);
  await page.getByRole('button', { name: /^anmelden$/i }).click();
  await expect(page).toHaveURL(/\/platform\/?$/, { timeout: 20_000 });
}

export async function loginTenantAdmin(page: Page, slug: string, email: string, password: string): Promise<void> {
  await page.goto(tenantRoute(slug, '/admin/login'));
  await page.getByLabel('Benutzername oder E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(password);
  await page.getByRole('button', { name: /anmelden/i }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/admin(?:/)?(?:\\?.*)?$`), { timeout: 20_000 });
}

export async function loginTenantStaff(page: Page, slug: string, username: string, password: string): Promise<void> {
  await page.goto(tenantRoute(slug, '/mitarbeiter/login'));
  await page.getByLabel('Benutzername oder E-Mail').fill(username);
  await page.getByLabel('Passwort').fill(password);
  await page.getByRole('button', { name: /anmelden/i }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/mitarbeiter`), { timeout: 20_000 });
}

export async function completeSetupWizard(page: Page, orgName: string): Promise<void> {
  await expect(page).toHaveURL(/\/admin\/einrichtung/, { timeout: 20_000 });

  for (let wizardStep = 0; wizardStep < 7; wizardStep += 1) {
    if (wizardStep === 1) {
      await page.getByRole('textbox', { name: 'Name' }).fill(orgName);
    }
    if (wizardStep === 5) {
      await page
        .locator('.MuiFormControlLabel-root')
        .filter({ hasText: /Veranstaltung überspringen/i })
        .locator('.MuiCheckbox-root')
        .click();
    }
    await page
      .getByRole('button', { name: wizardStep === 6 ? /konfiguration speichern/i : /^weiter$/i })
      .click();
  }

  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 20_000 });
}

function orderCard(page: Page, displayNumber: string) {
  const normalized = displayNumber.replace(/^#/, '');
  return page.locator('.MuiCard-root').filter({ hasText: normalized });
}

export async function readDisplayedPickupNumber(page: Page): Promise<string> {
  await expect(page.getByText(/abholnummer/i).first()).toBeVisible({ timeout: 15_000 });
  const text = (await page.getByRole('heading', { level: 1 }).first().textContent())?.trim() ?? '';
  expect(text.length).toBeGreaterThan(0);
  return text;
}

export async function submitPublicOrder(
  page: Page,
  slug: string,
  customer: { firstName: string; lastName: string }
): Promise<{ displayNumber: string }> {
  await page.goto(tenantRoute(slug, '/public'));
  await expect(page.getByRole('button', { name: /menge erhöhen/i }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /menge erhöhen/i }).first().click();
  await page.getByRole('button', { name: /^weiter$/i }).click();
  await expect(page.getByTestId('order-checkout-step')).toBeVisible({ timeout: 15_000 });
  await page.getByLabel(/vorname/i).fill(customer.firstName);
  await page.getByLabel(/nachname/i).fill(customer.lastName);
  await page.waitForTimeout(3500);
  const submit = page.getByRole('button', { name: /bestellung absenden|bestellen und bezahlen/i });
  const orderResponse = page.waitForResponse(
    (res) =>
      res.request().method() === 'POST'
      && res.url().includes('/public/orders')
      && !res.url().includes('/lookup')
      && !res.url().includes('/checkout'),
    { timeout: 25_000 }
  );
  await submit.click();
  const response = await orderResponse;
  expect(response.status()).toBe(201);
  await expect(page).toHaveURL(/status/, { timeout: 15_000 });
  const displayNumber = await readDisplayedPickupNumber(page);
  return { displayNumber };
}

export async function releaseOnlineOrderToKitchen(page: Page, displayNumber: string): Promise<void> {
  const card = orderCard(page, displayNumber);
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole('button', { name: /für küche freigeben/i }).click();
  await expect(card.getByRole('button', { name: /für küche freigeben/i })).toHaveCount(0);
}

export async function advanceOrderToReadyInKitchen(page: Page, displayNumber: string): Promise<void> {
  const card = orderCard(page, displayNumber);
  await expect(card).toBeVisible({ timeout: 15_000 });
  const start = card.getByRole('button', { name: /bearbeitung starten/i });
  if (await start.count()) {
    await start.click();
  }
  await card.getByRole('button', { name: /^fertig$/i }).click({ timeout: 15_000 });
}

export async function confirmPickup(
  page: Page,
  displayNumber: string,
  lastName?: string
): Promise<void> {
  await page.getByLabel('Abholnummer').fill(displayNumber.replace(/^#/, ''));
  if (lastName) {
    await page.getByLabel(/nachname/i).fill(lastName);
  }
  await page.getByRole('button', { name: /^suchen$/i }).click();
  await expect(page.getByRole('button', { name: /abholung bestätigen/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /abholung bestätigen/i }).click();
  await expect(page.getByText(/abholung bestätigt/i)).toBeVisible({ timeout: 15_000 });
}
