import { test, expect } from '@playwright/test';
import { waitForTemporaryPassword } from '../helpers/mailpit';
import {
  advanceOrderToReadyInKitchen,
  completeSetupWizard,
  confirmPickup,
  journeySlug,
  loginPlatformAdmin,
  loginTenantAdmin,
  loginTenantStaff,
  readDisplayedPickupNumber,
  releaseOnlineOrderToKitchen,
  STAFF_PASSWORD,
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
  cashierOrderNumber: '',
};

test.describe.configure({ mode: 'serial', timeout: 360_000 });

state.organization = `QA Journey ${state.slug}`;
state.adminEmail = `admin-${state.slug}@example.test`;

test.describe('FestSchmiede Nutzerreise (End-to-End)', () => {
  test('1 · Mandant beantragen (öffentliche Bewerbung)', async ({ page }) => {
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
    await page.getByRole('checkbox', { name: /datenschutzerklärung/i }).check();
    await page.getByRole('checkbox', { name: /nutzungsbedingungen/i }).check();

    await page.waitForTimeout(3500);
    await page.getByRole('button', { name: /bewerbung absenden/i }).click();
    await expect(page).toHaveURL(/mandant-beantragen\/bestaetigung/, { timeout: 20_000 });
  });

  test('2 · Bewerbung genehmigen und Mandant anlegen (Plattform)', async ({ page }) => {
    await loginPlatformAdmin(page);
    await page.goto('/platform/bewerbungen');
    await page.getByLabel('Suche').fill(state.slug);
    await expect(page.getByText(state.organization)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /details/i }).click();
    await expect(page.getByText(state.slug)).toBeVisible();
    await page.getByRole('button', { name: /^genehmigen$/i }).click();
    await expect(page.getByText(/aktion erfolgreich/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/genehmigt/i)).toBeVisible();
  });

  test('3 · Mandanten-Administrator einrichten (Einrichtungsassistent)', async ({ page }) => {
    state.adminPassword = await waitForTemporaryPassword(state.adminEmail);
    await loginTenantAdmin(page, state.slug, state.adminEmail, state.adminPassword);
    await completeSetupWizard(page, state.organization);
    await expect(page.getByText(/einstellungen|übersicht/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('4 · Veranstaltungen und Gerichte anlegen (Admin)', async ({ page }) => {
    await loginTenantAdmin(page, state.slug, state.adminEmail, state.adminPassword);

    await page.goto(tenantRoute(state.slug, '/admin/speisen'));
    const dishes = [
      { name: 'Bratwurst', price: '4.50' },
      { name: 'Pommes', price: '3.00' },
      { name: 'Schnitzel', price: '8.50' },
      { name: 'Apfelschorle', price: '2.50' },
    ];
    for (const dish of dishes) {
      await page.getByRole('button', { name: /neues gericht/i }).click();
      await page.getByLabel('Name').fill(dish.name);
      await page.getByLabel(/preis/i).fill(dish.price);
      await page.getByRole('button', { name: /^speichern$/i }).click();
      await expect(page.getByText(dish.name)).toBeVisible({ timeout: 15_000 });
    }

    await page.goto(tenantRoute(state.slug, '/admin/veranstaltungen'));
    const events = [
      { name: 'Sommerfest Haupttag', active: true },
      { name: 'Sommerfest Vortag', active: false },
      { name: 'Herbstfest', active: false },
    ];
    for (const event of events) {
      await page.getByRole('button', { name: /neue veranstaltung/i }).click();
      await page.getByLabel('Name').fill(event.name);
      await page.getByLabel('Datum').fill(today);
      if (!event.active) {
        await page.getByLabel('Veranstaltung aktiv').uncheck();
      }
      await page.getByRole('button', { name: /^speichern$/i }).click();
      await expect(page.getByText(event.name)).toBeVisible({ timeout: 15_000 });
    }

    const activeCard = page.locator('.MuiCard-root').filter({ hasText: 'Sommerfest Haupttag' });
    await activeCard.getByRole('button', { name: /^speisen$/i }).click();
    for (const dish of dishes) {
      await page.getByRole('button', { name: new RegExp(dish.name, 'i') }).click();
    }
    await page.getByRole('button', { name: /^speichern$/i }).click();
    await expect(page.getByText('Sommerfest Haupttag')).toBeVisible({ timeout: 15_000 });
  });

  test('5 · Mitarbeiter anlegen (Team)', async ({ page }) => {
    await loginTenantAdmin(page, state.slug, state.adminEmail, state.adminPassword);
    await page.goto(tenantRoute(state.slug, '/admin/benutzer'));
    await page.getByRole('button', { name: /neuer benutzer/i }).click();
    await page.getByLabel('Vorname').fill('Kasse');
    await page.getByLabel('Nachname').fill('QA');
    await page.getByLabel('Benutzername').fill('kasse1');
    await page.getByLabel('Passwort / PIN').fill(STAFF_PASSWORD);
    await page.locator('label').filter({ hasText: /^Kasse$/ }).click();
    await page.locator('label').filter({ hasText: /^Küche$/ }).click();
    await page.getByRole('button', { name: /^speichern$/i }).click();
    await expect(page.getByText('kasse1')).toBeVisible({ timeout: 15_000 });
  });

  test('6 · Online-Bestellungen (Public)', async ({ page }) => {
    const first = await submitPublicOrder(page, state.slug, { firstName: 'Online', lastName: 'Gast1' });
    state.onlineOrderNumber = first.displayNumber;
    await submitPublicOrder(page, state.slug, { firstName: 'Online', lastName: 'Gast2' });
    expect(state.onlineOrderNumber.length).toBeGreaterThan(0);
  });

  test('7 · Bestellungen vor Ort (Kasse)', async ({ page }) => {
    await loginTenantStaff(page, state.slug, 'kasse1', STAFF_PASSWORD);
    await page.goto(tenantRoute(state.slug, '/mitarbeiter/bestellung'));
    await expect(page.getByText(/bestellung vor ort/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /menge erhöhen/i }).first().click();
    await page.getByRole('button', { name: /bestellung speichern/i }).click();
    state.cashierOrderNumber = await readDisplayedPickupNumber(page);
    await page.getByRole('button', { name: /nächste bestellung/i }).click();

    await page.getByRole('button', { name: /menge erhöhen/i }).nth(1).click();
    await page.getByRole('button', { name: /bestellung speichern/i }).click();
    await expect(page.getByText(/abholnummer/i)).toBeVisible({ timeout: 20_000 });
  });

  test('8 · Mitarbeiter-Dashboard und Bestellübersicht', async ({ page }) => {
    await loginTenantStaff(page, state.slug, 'kasse1', STAFF_PASSWORD);

    await page.goto(tenantRoute(state.slug, '/mitarbeiter'));
    await expect(page.getByText(/bestellungen/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/[1-9]/).first()).toBeVisible();

    await page.goto(tenantRoute(state.slug, '/mitarbeiter/bestellungen'));
    await expect(page.getByRole('heading', { name: /bestellungen/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/keine bestellungen/i)).toHaveCount(0);
  });

  test('9 · Admin-Dashboard (Übersicht)', async ({ page }) => {
    await loginTenantAdmin(page, state.slug, state.adminEmail, state.adminPassword);
    await page.goto(tenantRoute(state.slug, '/admin'));
    await expect(page.getByRole('heading', { name: /^administration$/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/veranstalter, team und funktionen/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /veranstaltungen/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^team$/i }).first()).toBeVisible();
    await page.getByText('Erweitert').first().click();
    await expect(page.getByText(/echtzeit|funktionsstatus/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('10 · Küche: Freigabe und Fertigstellung', async ({ page }) => {
    await loginTenantStaff(page, state.slug, 'kasse1', STAFF_PASSWORD);

    await page.goto(tenantRoute(state.slug, '/mitarbeiter/bestellungen'));
    await releaseOnlineOrderToKitchen(page, state.onlineOrderNumber);

    await page.goto(tenantRoute(state.slug, '/mitarbeiter/kueche'));
    await expect(page.getByText(/aktive bestellungen/i)).toBeVisible({ timeout: 20_000 });
    await advanceOrderToReadyInKitchen(page, state.onlineOrderNumber);
    await advanceOrderToReadyInKitchen(page, state.cashierOrderNumber);
  });

  test('11 · Abholung bestätigen', async ({ page }) => {
    await loginTenantStaff(page, state.slug, 'kasse1', STAFF_PASSWORD);
    await page.goto(tenantRoute(state.slug, '/mitarbeiter/abholung'));
    await expect(page.getByRole('heading', { name: /abholung bestätigen/i })).toBeVisible({ timeout: 20_000 });

    await confirmPickup(page, state.onlineOrderNumber, 'Gast1');
    await confirmPickup(page, state.cashierOrderNumber);
  });

  test('12 · Mandant DSGVO-konform löschen (Plattform)', async ({ page }) => {
    await loginPlatformAdmin(page);
    await page.goto('/platform/mandanten');
    await page.getByLabel('Suche').fill(state.slug);
    await expect(page.getByText(state.organization)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /details/i }).click();

    await expect(page.getByText(state.slug)).toBeVisible();
    await expect(page.getByText('Statistik')).toBeVisible();
    await expect(
      page.locator('div').filter({ has: page.getByText('Bestellungen', { exact: true }) })
    ).toContainText(/[4-9]/);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /^löschen$/i }).click();
    await expect(page).toHaveURL(/\/platform\/mandanten\/?$/, { timeout: 20_000 });

    await page.getByLabel('Suche').fill(state.slug);
    await expect(page.getByText(state.organization)).toHaveCount(0);

    await page.goto(tenantRoute(state.slug, '/public'));
    await expect(page.getByText(/veranstalter nicht gefunden/i)).toBeVisible({ timeout: 20_000 });
  });
});
