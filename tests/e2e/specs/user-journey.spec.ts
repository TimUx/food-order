import { test, expect, type Page } from '@playwright/test';
import { waitForTemporaryPassword } from '../helpers/mailpit';
import {
  advanceOrderToReadyInKitchen,
  completeSetupWizard,
  confirmPickup,
  deletePlatformTenantFromDetail,
  ensurePlatformAdmin,
  expectStaffDashboardOrderCount,
  journeySlug,
  loginPlatformAdmin,
  loginTenantAdmin,
  loginTenantStaff,
  releaseOnlineOrderToKitchen,
  STAFF_PASSWORD,
  selectStaffEvent,
  submitPublicOrder,
  tenantRoute,
} from '../helpers/journey';

const today = new Date().toISOString().split('T')[0];

const state = {
  slug: journeySlug(),
  organization: '',
  adminEmail: '',
  adminPassword: '',
  onlineOrderNumber: '',
  onlineOrderNum: 0,
  onlineCustomerLastName: '',
  cashierOrderNumber: '',
  cashierOrderNum: 0,
};

state.organization = `QA Journey ${state.slug}`;
state.adminEmail = `admin-${state.slug}@example.test`;

// Ein Mandant, gemeinsame Browser-Session und geteiltes `state` — Schritte müssen serial laufen.
test.describe('FestSchmiede Nutzerreise (End-to-End)', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('1 · Mandant beantragen (öffentliche Bewerbung)', async () => {
    await page.goto('/mandant-beantragen');
    await expect(page.getByRole('heading', { name: /mandant beantragen/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('textbox', { name: 'Organisation' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('textbox', { name: 'Organisation' }).fill(state.organization);
    await page.getByRole('textbox', { name: 'Ansprechpartner' }).fill('QA Ansprechpartner');
    await page.getByRole('textbox', { name: 'E-Mail' }).fill(state.adminEmail);
    await page.getByRole('textbox', { name: 'Straße' }).fill('Musterstraße 1');
    await page.getByRole('textbox', { name: 'PLZ' }).fill('12345');
    await page.getByRole('textbox', { name: 'Ort' }).fill('Musterstadt');
    await page.getByRole('textbox', { name: /gewünschte internetadresse/i }).fill(state.slug);
    await page.locator('[data-field="reason"]').getByRole('textbox').fill(
      'Wir organisieren jährlich ein Vereinsfest und benötigen eine digitale Bestelllösung für Speisen und Getränke.'
    );
    await page.locator('[data-field="desiredFeatures"]').getByRole('textbox').fill(
      'Online-Bestellung, Küchenmonitor, Abholung und Kassenbestellung vor Ort.'
    );
    await page.locator('[data-field="freeTierJustification"]').getByRole('textbox').fill(
      'Als gemeinnütziger Verein mit ehrenamtlichem Team benötigen wir eine kostenfreie Lösung für unser Sommerfest.'
    );
    await page.locator('[data-field="plannedUsage"]').getByRole('textbox').fill(
      'Zwei Feste pro Jahr mit jeweils 200–400 Gästen und 3–5 Veranstaltungen im Vereinsheim.'
    );
    const form = page.locator('form');
    await form.locator('.MuiFormControlLabel-root').filter({ hasText: /Datenschutzerklärung/i }).locator('.MuiCheckbox-root').click();
    await form.locator('.MuiFormControlLabel-root').filter({ hasText: /Nutzungsbedingungen/i }).locator('.MuiCheckbox-root').click();
    await expect(form.locator('input[type="checkbox"]').nth(0)).toBeChecked();
    await expect(form.locator('input[type="checkbox"]').nth(1)).toBeChecked();

    await page.waitForTimeout(3500);
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/tenant-applications') && r.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: /bewerbung absenden/i }).click(),
    ]);
    if (!response.ok()) {
      throw new Error(`Bewerbung API ${response.status()}: ${await response.text()}`);
    }
    await expect(page).toHaveURL(/mandant-beantragen\/bestaetigung/, { timeout: 20_000 });
  });

  test('2 · Bewerbung genehmigen und Mandant anlegen (Plattform)', async () => {
    await loginPlatformAdmin(page);
    await page.goto('/platform/bewerbungen');
    await page.getByLabel('Suche').fill(state.slug);
    await expect(page.getByText(state.organization)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /details/i }).click();
    await expect(page.getByText(new RegExp(`Gewünschte Internetadresse:\\s*${state.slug}`, 'i'))).toBeVisible();
    await page.getByRole('button', { name: /^genehmigen$/i }).click();
    await expect(page.getByText(/aktion erfolgreich/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/genehmigt/i)).toBeVisible();
  });

  test('3 · Mandanten-Administrator einrichten (Einrichtungsassistent)', async () => {
    state.adminPassword = await waitForTemporaryPassword(state.adminEmail, { timeoutMs: 30_000 });
    await loginTenantAdmin(page, state.slug, state.adminEmail, state.adminPassword);
    await completeSetupWizard(page, state.organization);
    await expect(page.getByText(/einstellungen|übersicht/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('4 · Veranstaltungen und Gerichte anlegen (Admin)', async () => {
    await page.goto(tenantRoute(state.slug, '/admin/speisen'));
    await expect(page.getByRole('heading', { name: 'Gerichte verwalten' })).toBeVisible({ timeout: 30_000 });

    const dishes = [
      { name: 'Bratwurst', price: '4.50' },
      { name: 'Pommes', price: '3.00' },
      { name: 'Schnitzel', price: '8.50' },
      { name: 'Apfelschorle', price: '2.50' },
    ];
    for (const dish of dishes) {
      await page.getByRole('button', { name: /neues gericht/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await dialog.getByRole('textbox', { name: 'Name' }).fill(dish.name);
      await dialog.getByLabel(/preis/i).fill(dish.price);
      await dialog.getByRole('button', { name: /^speichern$/i }).click();
      await expect(page.getByText(dish.name)).toBeVisible({ timeout: 15_000 });
    }

    await page.goto(tenantRoute(state.slug, '/admin/veranstaltungen'));
    await expect(page.getByRole('button', { name: /neue veranstaltung/i })).toBeVisible({ timeout: 30_000 });

    const events = [
      { name: 'Sommerfest Haupttag', active: true },
      { name: 'Sommerfest Vortag', active: false },
      { name: 'Herbstfest', active: false },
    ];
    for (const event of events) {
      await page.getByRole('button', { name: /neue veranstaltung/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await dialog.getByRole('textbox', { name: 'Name' }).fill(event.name);
      await dialog.getByLabel('Datum').fill(today);
      if (!event.active) {
        await dialog.getByRole('switch', { name: /veranstaltung aktiv/i }).click();
      }
      await dialog.getByRole('button', { name: /^speichern$/i }).click();
      await expect(page.getByText(event.name)).toBeVisible({ timeout: 15_000 });
    }

    const activeCard = page.locator('.MuiCard-root').filter({ hasText: 'Sommerfest Haupttag' });
    await activeCard.getByRole('button', { name: /^speisen$/i }).click();
    const foodDialog = page.getByRole('dialog').filter({ hasText: /Speisen für Sommerfest Haupttag/i });
    await expect(foodDialog).toBeVisible({ timeout: 10_000 });
    await expect(foodDialog.getByText(/\d+ von \d+ ausgewählt/)).toBeVisible({ timeout: 15_000 });
    for (const dish of dishes) {
      await foodDialog.getByRole('button', { name: new RegExp(dish.name, 'i') }).click();
    }
    await foodDialog.getByRole('button', { name: /^speichern$/i }).click();
    await expect(foodDialog).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText('Sommerfest Haupttag')).toBeVisible({ timeout: 10_000 });
  });

  test('5 · Mitarbeiter anlegen (Team)', async () => {
    await page.goto(tenantRoute(state.slug, '/admin/benutzer'));
    await page.getByRole('button', { name: /neuer benutzer/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /neuer benutzer/i })).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('textbox', { name: 'Vorname' }).fill('Kasse');
    await dialog.getByRole('textbox', { name: 'Nachname' }).fill('QA');
    await dialog.getByRole('textbox', { name: 'Benutzername' }).fill('kasse1');
    await dialog.getByRole('textbox', { name: /passwort/i }).fill(STAFF_PASSWORD);
    await dialog.getByRole('checkbox', { name: /Kasse/i }).check();
    await dialog.getByRole('checkbox', { name: /Abholung/i }).check();
    await expect(dialog.getByRole('checkbox', { name: /Küche/i })).toBeChecked();
    await dialog.getByRole('button', { name: /^speichern$/i }).click();
    await expect(page.getByText('kasse1')).toBeVisible({ timeout: 15_000 });
  });

  test('6 · Online-Bestellungen (Public)', async () => {
    const first = await submitPublicOrder(page, state.slug, { firstName: 'Online', lastName: 'Gast1' });
    state.onlineOrderNumber = first.displayNumber;
    state.onlineOrderNum = first.orderNumber;
    state.onlineCustomerLastName = first.customerLastName;
    await submitPublicOrder(page, state.slug, { firstName: 'Online', lastName: 'Gast2' });
    expect(state.onlineOrderNumber.length).toBeGreaterThan(0);
  });

  test('7 · Bestellungen vor Ort (Kasse)', async () => {
    await loginTenantStaff(page, state.slug, 'kasse1', STAFF_PASSWORD);
    await page.goto(tenantRoute(state.slug, '/mitarbeiter/bestellung'));
    await expect(page.getByText(/bestellung vor ort/i)).toBeVisible({ timeout: 20_000 });
    await selectStaffEvent(page, 'Sommerfest Haupttag');
    await expect(page.getByRole('button', { name: /menge erhöhen/i }).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /menge erhöhen/i }).first().click();
    const [cashierResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/staff/orders/cashier') && res.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      page.getByRole('button', { name: /bestellung speichern/i }).click(),
    ]);
    expect(cashierResponse.ok()).toBeTruthy();
    const cashierOrder = (await cashierResponse.json()) as { displayNumber: string; orderNumber: number };
    state.cashierOrderNumber = cashierOrder.displayNumber;
    state.cashierOrderNum = cashierOrder.orderNumber;
    await page.getByRole('button', { name: /nächste bestellung/i }).click();

    await page.getByRole('button', { name: /menge erhöhen/i }).nth(1).click();
    await page.getByRole('button', { name: /bestellung speichern/i }).click();
    await expect(page.getByText(/abholnummer/i)).toBeVisible({ timeout: 20_000 });
  });

  test('8 · Mitarbeiter-Dashboard und Bestellübersicht', async () => {
    await page.goto(tenantRoute(state.slug, '/mitarbeiter'));
    await selectStaffEvent(page, 'Sommerfest Haupttag');
    await expectStaffDashboardOrderCount(page, 1);

    await page.goto(tenantRoute(state.slug, '/mitarbeiter/bestellungen'));
    await selectStaffEvent(page, 'Sommerfest Haupttag');
    await expect(page.getByRole('heading', { name: /bestellungen/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/keine bestellungen/i)).toHaveCount(0, { timeout: 30_000 });
  });

  test('9 · Admin-Dashboard (Übersicht)', async () => {
    await loginTenantAdmin(page, state.slug, state.adminEmail, state.adminPassword);
    await page.goto(tenantRoute(state.slug, '/admin'));
    await expect(page.getByRole('heading', { name: /^administration$/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/veranstalter, team und funktionen/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /veranstaltungen/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^team$/i }).first()).toBeVisible();
    await page.getByText('Erweitert').first().click();
    await expect(page.getByText(/echtzeit|funktionsstatus/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('10 · Küche: Freigabe und Fertigstellung', async () => {
    await loginTenantStaff(page, state.slug, 'kasse1', STAFF_PASSWORD);
    await selectStaffEvent(page, 'Sommerfest Haupttag');

    await page.goto(tenantRoute(state.slug, '/mitarbeiter/bestellungen'));
    await releaseOnlineOrderToKitchen(page, state.onlineOrderNumber);

    await page.goto(tenantRoute(state.slug, '/mitarbeiter/kueche'));
    await expect(page.getByText(/aktive bestellungen/i)).toBeVisible({ timeout: 20_000 });
    await advanceOrderToReadyInKitchen(page, state.onlineOrderNumber);
    await advanceOrderToReadyInKitchen(page, state.cashierOrderNumber);
  });

  test('11 · Abholung bestätigen', async () => {
    await loginTenantStaff(page, state.slug, 'kasse1', STAFF_PASSWORD);
    await page.goto(tenantRoute(state.slug, '/mitarbeiter/abholung'));
    await expect(page.getByRole('heading', { name: /abholung bestätigen/i })).toBeVisible({ timeout: 20_000 });
    await selectStaffEvent(page, 'Sommerfest Haupttag');
    await expect(page.getByLabel('Abholnummer')).toBeEnabled({ timeout: 15_000 });

    await confirmPickup(page, { orderNumber: state.onlineOrderNum, lastName: state.onlineCustomerLastName });
    await confirmPickup(page, { orderNumber: state.cashierOrderNum });
  });

  test('12 · Mandant DSGVO-konform löschen (Plattform)', async () => {
    await ensurePlatformAdmin(page);
    await page.getByLabel('Suche').fill(state.slug);
    const tenantRow = page.getByRole('row').filter({
      has: page.getByRole('cell', { name: state.slug, exact: true }),
    });
    await expect(tenantRow).toHaveCount(1, { timeout: 20_000 });
    await tenantRow.getByRole('button', { name: /details/i }).click();
    await expect(page).toHaveURL(/\/platform\/mandanten\/[0-9a-f-]+$/i, { timeout: 20_000 });

    await expect(page.getByRole('heading', { name: state.organization })).toBeVisible();
    const statistik = page.locator('.MuiPaper-root').filter({
      has: page.getByRole('heading', { name: 'Statistik' }),
    });
    await expect(statistik).toBeVisible();
    await expect(statistik.getByText('Bestellungen', { exact: true })).toBeVisible();
    await expect(statistik).toContainText(/[4-9]/);

    await deletePlatformTenantFromDetail(page);

    await page.getByLabel('Suche').fill(state.slug);
    await expect(page.getByText(state.organization)).toHaveCount(0);

    await page.goto(tenantRoute(state.slug, '/public'));
    await expect(page.getByText(/veranstalter nicht gefunden/i)).toBeVisible({ timeout: 20_000 });
  });
});
