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
  await expect(page.getByLabel('Benutzername oder E-Mail')).toBeVisible({ timeout: 20_000 });
  await page.getByLabel('Benutzername oder E-Mail').fill(PLATFORM_ADMIN.email);
  await page.getByLabel('Passwort').fill(PLATFORM_ADMIN.password);
  await page.getByRole('button', { name: /^anmelden$/i }).click();
  await expect(page).toHaveURL(/\/platform\/?$/, { timeout: 20_000 });
}

/** Plattform-Session nutzen oder anmelden — für Schritte nach Mitarbeiter-Login. */
export async function ensurePlatformAdmin(page: Page): Promise<void> {
  await page.goto('/platform/mandanten');
  await page.waitForURL(/\/platform(\/mandanten|\/login)/, { timeout: 20_000 });
  if (page.url().includes('/login')) {
    await expect(page.getByLabel('Benutzername oder E-Mail')).toBeVisible({ timeout: 20_000 });
    await page.getByLabel('Benutzername oder E-Mail').fill(PLATFORM_ADMIN.email);
    await page.getByLabel('Passwort').fill(PLATFORM_ADMIN.password);
    await page.getByRole('button', { name: /^anmelden$/i }).click();
    await page.waitForURL(/\/platform\/mandanten/, { timeout: 20_000 });
  }
  await expect(page.getByRole('heading', { name: /mandanten/i })).toBeVisible({ timeout: 20_000 });
}

export async function loginTenantAdmin(page: Page, slug: string, email: string, password: string): Promise<void> {
  await page.goto(tenantRoute(slug, '/admin/login'));
  await page.getByLabel('Benutzername oder E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(password);
  await page.getByRole('button', { name: /anmelden/i }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/admin`), { timeout: 20_000 });
}

export async function loginTenantStaff(page: Page, slug: string, username: string, password: string): Promise<void> {
  await page.goto(tenantRoute(slug, '/mitarbeiter/login'));
  await page.getByLabel('Benutzername oder E-Mail').fill(username);
  await page.getByLabel('Passwort').fill(password);
  await page.getByRole('button', { name: /anmelden/i }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/mitarbeiter`), { timeout: 20_000 });
}

export async function selectStaffEvent(page: Page, eventName: string): Promise<void> {
  const eventSelect = page.getByRole('combobox', { name: /veranstaltung/i }).first();
  await expect(eventSelect).toBeVisible({ timeout: 20_000 });
  const current = (await eventSelect.textContent()) ?? '';
  if (!new RegExp(eventName, 'i').test(current)) {
    await eventSelect.click();
    await page.getByRole('option', { name: new RegExp(eventName, 'i') }).click();
  }
  await expect(eventSelect).toContainText(eventName);
}

export async function waitForStaffEventStats(page: Page): Promise<void> {
  const ordersCard = page.locator('.MuiCard-root').filter({
    has: page.getByText('Bestellungen', { exact: true }),
  });
  await expect(ordersCard).toBeVisible({ timeout: 20_000 });
  await expect.poll(
    async () => Number((await ordersCard.locator('.MuiTypography-h5').first().textContent()) ?? '0'),
    { timeout: 30_000 },
  ).toBeGreaterThan(0);
}

export async function expectStaffDashboardOrderCount(page: Page, minCount = 1): Promise<void> {
  const ordersCard = page.locator('.MuiCard-root').filter({
    has: page.getByText('Bestellungen', { exact: true }),
  });
  await expect(ordersCard).toBeVisible({ timeout: 20_000 });
  await expect.poll(
    async () => Number((await ordersCard.locator('.MuiTypography-h5').first().textContent()) ?? '0'),
    { timeout: 30_000 },
  ).toBeGreaterThanOrEqual(minCount);
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

export interface CreatedOrderRef {
  displayNumber: string;
  orderNumber: number;
  customerLastName?: string;
}

export async function submitPublicOrder(
  page: Page,
  slug: string,
  customer: { firstName: string; lastName: string }
): Promise<CreatedOrderRef & { customerLastName: string }> {
  await page.goto(tenantRoute(slug, '/public'));
  await expect(page.getByRole('button', { name: /menge erhöhen/i }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /menge erhöhen/i }).first().click();
  await page.getByRole('button', { name: /^weiter$/i }).click();
  const checkout = page.getByTestId('order-checkout-step');
  await expect(checkout).toBeVisible({ timeout: 15_000 });
  await checkout.getByRole('textbox', { name: /vorname/i }).fill(customer.firstName);
  await checkout.getByRole('textbox', { name: /nachname/i }).fill(customer.lastName);
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
  const created = (await response.json()) as {
    displayNumber: string;
    orderNumber: number;
    customer?: { lastName?: string | null } | null;
  };
  expect(created.displayNumber.length).toBeGreaterThan(0);
  expect(created.orderNumber).toBeGreaterThan(0);
  const customerLastName = (created.customer?.lastName ?? customer.lastName).trim();
  expect(customerLastName.length).toBeGreaterThan(0);
  await expect(page).toHaveURL(/status/, { timeout: 15_000 });
  return {
    displayNumber: created.displayNumber,
    orderNumber: created.orderNumber,
    customerLastName,
  };
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

async function enterPickupNumber(page: Page, orderNumber: number): Promise<void> {
  await page.getByRole('button', { name: 'C', exact: true }).click();
  for (const digit of String(orderNumber)) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await expect(page.getByLabel('Abholnummer')).toHaveValue(String(orderNumber));
}

export async function confirmPickup(
  page: Page,
  order: { orderNumber: number; lastName?: string; eventName?: string }
): Promise<void> {
  const eventName = order.eventName ?? 'Sommerfest Haupttag';

  await expect(page.getByLabel('Abholnummer')).toBeEnabled({ timeout: 15_000 });

  const eventSelect = page.getByRole('combobox', { name: /veranstaltung/i }).first();
  if (!new RegExp(eventName, 'i').test((await eventSelect.textContent()) ?? '')) {
    await eventSelect.click();
    await page.getByRole('option', { name: new RegExp(eventName, 'i') }).click();
  }
  await expect(eventSelect).toContainText(eventName);

  await enterPickupNumber(page, order.orderNumber);
  const lastNameField = page.getByLabel(/nachname \(optional/i);
  if (order.lastName) {
    await lastNameField.fill(order.lastName);
  } else {
    await lastNameField.clear();
  }

  const lookupResponse = page.waitForResponse(
    (res) => res.url().includes('/staff/orders/lookup') && res.request().method() === 'POST',
    { timeout: 15_000 },
  );
  await page.getByRole('button', { name: /^suchen$/i }).click();
  const response = await lookupResponse;
  if (!response.ok()) {
    const alertText = (await page.locator('[role="alert"]').first().textContent())?.trim() ?? '';
    const payload = response.request().postDataJSON() as Record<string, unknown> | undefined;
    throw new Error(
      `Abholung-Suche fehlgeschlagen (${response.status()}): ${alertText || await response.text()}`
      + (payload ? ` · Payload: ${JSON.stringify(payload)}` : ''),
    );
  }

  await expect(page.getByRole('button', { name: /abholung bestätigen/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /abholung bestätigen/i }).click();
  await expect(page.getByText(/abholung bestätigt/i)).toBeVisible({ timeout: 15_000 });
}

export async function deletePlatformTenantFromDetail(page: Page): Promise<void> {
  const deleteButton = page.getByRole('button', { name: /^löschen$/i });
  await deleteButton.scrollIntoViewIfNeeded();
  const dialogWait = page.waitForEvent('dialog', { timeout: 10_000 }).then((dialog) => dialog.accept());
  const deleteWait = page.waitForResponse(
    (res) => res.request().method() === 'DELETE' && /\/tenants\/[0-9a-f-]+(?:\?|$)/i.test(res.url()),
    { timeout: 30_000 },
  );
  await deleteButton.click();
  const [, response] = await Promise.all([dialogWait, deleteWait]);
  if (!response.ok()) {
    throw new Error(`Mandant löschen fehlgeschlagen (${response.status()}): ${await response.text()}`);
  }
  await expect(page).toHaveURL(/\/platform\/mandanten\/?$/, { timeout: 20_000 });
}
