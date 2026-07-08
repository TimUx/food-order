/**
 * Erstellt Screenshots aller Ansichten für die Dokumentation.
 * Verwendet API-Mocking mit realistischen Beispieldaten.
 * Standardauflösung: 1920×1080 (Full HD).
 */
import { chromium, Page } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { execFileSync } from 'child_process';

const PORT = 4173;
const OUT_DIR = join(process.cwd(), 'docs', 'screenshots');
const RAW_DIR = join(OUT_DIR, '_raw');
const DIST = join(process.cwd(), 'frontend', 'dist');
const FULL_HD = { width: 1920, height: 1080 };

/** Viewports müssen exakt zu scripts/embed-device-frame.py SCREEN_* passen */
const DEVICE_CAPTURES = {
  monitor: { width: 1280, height: 720 },
  iphone: { width: 390, height: 844 },
  ipad: { width: 768, height: 1024 },
} as const;

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const ORDER_ID = '00000000-0000-0000-0000-000000000042';

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

const mockClub = {
  clubName: 'SV Musterstadt e.V.',
  description: 'Sportverein Musterstadt – seit 1920',
  contactName: 'Vereinsverwaltung',
  email: 'kontakt@sv-musterstadt.de',
  phone: '+49 1234 567890',
  address: 'Sportplatzstraße 1, 12345 Musterstadt',
  website: 'https://www.sv-musterstadt.de',
  logoUrl: null,
  orderFieldFirstNameRequired: true,
  orderFieldLastNameRequired: true,
  orderFieldEmailRequired: false,
  orderFieldPhoneRequired: false,
  cancellationDeadlineHours: 24,
};

const mockEmailSettings = {
  smtpHost: 'smtp.sv-musterstadt.de',
  smtpPort: 587,
  smtpUser: 'noreply@sv-musterstadt.de',
  smtpFrom: 'noreply@sv-musterstadt.de',
  smtpPassConfigured: true,
  smtpEnabled: true,
  emailCustomText: 'Bitte holen Sie Ihre Bestellung am Veranstaltungstag an der Hauptkasse ab.',
};

const mockOrderSettings = {
  fields: {
    firstNameRequired: true,
    lastNameRequired: true,
    emailRequired: false,
    phoneRequired: false,
  },
  cancellationDeadlineHours: 24,
};

const mockEvent = {
  id: EVENT_ID,
  name: 'Sommerfest 2026',
  description: 'Jährliches Vereins-Sommerfest mit leckerem Essen',
  date: '2026-08-15T00:00:00.000Z',
  startTime: '11:00',
  endTime: '22:00',
  onlineOrdersActive: true,
  cashierActive: true,
  ordersClosed: false,
  isActive: true,
  eventDateLabel: 'Samstag, 15. August 2026',
};

const mockFoodItems = [
  { id: '00000000-0000-0000-0001-000000000001', eventId: EVENT_ID, name: 'Bratwurst mit Brötchen', description: 'Frische Bratwurst vom Grill mit Senf und Brötchen', price: 4.5, sortOrder: 1, active: true, soldOut: false },
  { id: '00000000-0000-0000-0001-000000000002', eventId: EVENT_ID, name: 'Currywurst', description: 'Currywurst mit Pommes und hausgemachter Soße', price: 6.0, sortOrder: 2, active: true, soldOut: false },
  { id: '00000000-0000-0000-0001-000000000003', eventId: EVENT_ID, name: 'Schnitzel mit Pommes', description: 'Paniertes Schnitzel mit knusprigen Pommes', price: 8.5, sortOrder: 3, active: true, soldOut: false },
  { id: '00000000-0000-0000-0001-000000000004', eventId: EVENT_ID, name: 'Vegetarischer Burger', description: 'Gemüseburger mit Salat und hausgemachter Soße', price: 7.0, sortOrder: 4, active: true, soldOut: false },
  { id: '00000000-0000-0000-0001-000000000005', eventId: EVENT_ID, name: 'Apfelstrudel', description: 'Warmer Apfelstrudel mit Vanillesauce', price: 3.5, sortOrder: 5, active: true, soldOut: false },
];

const mockOrderBase = {
  orderDate: '2026-08-15T00:00:00.000Z',
  eventDateLabel: 'Samstag, 15. August 2026',
  source: 'ONLINE',
  sourceLabel: 'Online',
  totalPrice: 15.0,
  createdAt: '2026-07-08T10:30:00.000Z',
  customer: { firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', phone: '+49 170 1234567' },
  items: [
    { id: 'i1', foodItemId: mockFoodItems[0].id, name: 'Bratwurst mit Brötchen', quantity: 2, unitPrice: 4.5, lineTotal: 9 },
    { id: 'i2', foodItemId: mockFoodItems[1].id, name: 'Currywurst', quantity: 1, unitPrice: 6, lineTotal: 6 },
  ],
};

const mockOrders = [
  { ...mockOrderBase, id: '00000000-0000-0000-0000-000000000041', orderNumber: 41, displayNumber: '041', status: 'NEW', statusLabel: 'Neu' },
  { ...mockOrderBase, id: '00000000-0000-0000-0000-000000000042', orderNumber: 42, displayNumber: '042', status: 'IN_PROGRESS', statusLabel: 'In Bearbeitung' },
  { ...mockOrderBase, id: '00000000-0000-0000-0000-000000000043', orderNumber: 43, displayNumber: '043', status: 'READY', statusLabel: 'Fertig', totalPrice: 8.5, items: [{ id: 'i3', foodItemId: mockFoodItems[2].id, name: 'Schnitzel mit Pommes', quantity: 1, unitPrice: 8.5, lineTotal: 8.5 }] },
  { ...mockOrderBase, id: '00000000-0000-0000-0000-000000000044', orderNumber: 44, displayNumber: '044', status: 'PICKED_UP', statusLabel: 'Abgeholt', source: 'CASHIER', sourceLabel: 'Vor Ort' },
];

const mockStats = {
  totalOrders: 87,
  openOrders: 12,
  readyOrders: 5,
  pickedUpOrders: 68,
  revenue: 1243.5,
  popularDishes: [
    { name: 'Bratwurst mit Brötchen', count: 45 },
    { name: 'Currywurst', count: 32 },
    { name: 'Schnitzel mit Pommes', count: 28 },
    { name: 'Vegetarischer Burger', count: 19 },
    { name: 'Apfelstrudel', count: 15 },
  ],
  avgProcessingMinutes: 8,
};

const mockUser = { id: 'u1', email: 'admin@verein.local', firstName: 'Admin', lastName: 'Verein', role: 'ADMIN' };

const mockUsers = [
  { id: 'u1', email: 'admin@verein.local', firstName: 'Admin', lastName: 'Verein', role: 'ADMIN', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'u2', email: 'kueche@verein.local', firstName: 'Küche', lastName: 'Team', role: 'STAFF', active: true, createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 'u3', email: 'service@verein.local', firstName: 'Service', lastName: 'Muster', role: 'STAFF', active: false, createdAt: '2026-02-15T00:00:00.000Z' },
];

function mockApi(pathname: string, method: string, body?: string): unknown {
  if (pathname === '/api/public/order-settings') return mockOrderSettings;
  if (pathname === '/api/admin/email-settings') return mockEmailSettings;
  if (pathname === '/api/public/club' || pathname === '/api/staff/club' || pathname === '/api/admin/club') return mockClub;
  if (pathname === '/api/public/menu') {
    return { event: mockEvent, items: mockFoodItems, preOrderInfo: 'Vorbestellung möglich' };
  }
  if (pathname === '/api/public/event') return mockEvent;
  if (pathname === `/api/public/orders/${ORDER_ID}`) {
    return {
      ...mockOrders[1],
      canCancel: true,
      cancellationDeadline: '2026-08-14T11:00:00.000Z',
      cancellationDeadlineLabel: 'Freitag, 14. August 2026, 11:00',
    };
  }
  if (pathname === '/api/public/pickup-board') {
    return [
      { id: mockOrders[2].id, orderNumber: 43, displayNumber: '043', readyAt: '2026-07-08T11:00:00.000Z' },
      { id: '00000000-0000-0000-0000-000000000045', orderNumber: 45, displayNumber: '045', readyAt: '2026-07-08T11:05:00.000Z' },
      { id: '00000000-0000-0000-0000-000000000046', orderNumber: 46, displayNumber: '046', readyAt: '2026-07-08T11:08:00.000Z' },
    ];
  }
  if (pathname === '/api/public/orders/lookup' && method === 'POST') {
    return mockOrders[1];
  }
  if (pathname === '/api/auth/login') {
    return { token: 'mock-token', user: mockUser };
  }
  if (pathname === '/api/auth/me') return mockUser;
  if (pathname === '/api/staff/events/active') return mockEvent;
  if (pathname === '/api/staff/events') return [mockEvent];
  if (pathname.includes('/food-items')) return mockFoodItems;
  if (pathname.includes('/stats')) return mockStats;
  if (pathname.includes('/orders/lookup') && method === 'POST') {
    return mockOrders[2];
  }
  if (pathname.match(/\/staff\/events\/[^/]+\/orders$/) && method === 'GET') return mockOrders;
  if (pathname === '/api/admin/users' && method === 'GET') return mockUsers;
  if (pathname === '/api/health') return { status: 'ok' };
  return {};
}

function startStaticServer(): Promise<void> {
  return new Promise((resolve) => {
    createServer((req, res) => {
      let filePath = join(DIST, (req.url || '/').split('?')[0]);
      if (filePath.endsWith('/')) filePath += 'index.html';
      if (!existsSync(filePath)) filePath = join(DIST, 'index.html');
      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
    }).listen(PORT, () => resolve());
  });
}

async function setupPage(page: Page, auth = false) {
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const body = mockApi(url.pathname, route.request().method(), route.request().postData() || undefined);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  if (auth) {
    await page.addInitScript(() => {
      localStorage.setItem('verein_token', 'mock-token');
    });
  }
}

async function prepareOrderPage(page: Page) {
  await page.getByLabel('Vorname *').fill('Max');
  await page.getByLabel('Nachname *').fill('Mustermann');
  const dishesScroll = page.getByTestId('order-dishes-scroll');
  await dishesScroll.evaluate((el) => { el.scrollTop = 0; });
  const increaseButtons = page.locator('button[aria-label="Menge erhöhen"]');
  await increaseButtons.first().click({ force: true });
  await increaseButtons.first().click({ force: true });
  await increaseButtons.nth(1).click({ force: true });
  await increaseButtons.nth(2).click({ force: true });
  await dishesScroll.evaluate((el) => { el.scrollTop = 0; });
}

async function prepareOrderPageForDevice(page: Page, device: keyof typeof DEVICE_CAPTURES) {
  await prepareOrderPage(page);

  if (device === 'monitor') {
    // Im 720px-Monitor-Viewport: Formular ausblenden, damit Gerichte sichtbar sind
    await page.getByTestId('order-customer-form').evaluate((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    await page.getByRole('heading', { name: 'Gerichte', exact: true }).scrollIntoViewIfNeeded();
    await page.getByTestId('order-dishes-scroll').evaluate((el) => { el.scrollTop = 0; });
  }
}

interface PageSpec {
  name: string;
  url: string;
  viewport?: { width: number; height: number };
  auth?: boolean;
  prepare?: (page: Page) => Promise<void>;
}

function embedDevice(rawPath: string, device: 'iphone' | 'ipad' | 'monitor', outPath: string) {
  execFileSync('python3', [
    join(process.cwd(), 'scripts', 'embed-device-frame.py'),
    rawPath,
    device,
    outPath,
  ], { stdio: 'inherit' });
}

async function captureScreenshot(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  spec: PageSpec,
) {
  const viewport = spec.viewport || FULL_HD;
  const context = await browser.newContext({ viewport, locale: 'de-DE' });
  const page = await context.newPage();
  await setupPage(page, spec.auth);

  await page.goto(`http://localhost:${PORT}${spec.url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (spec.prepare) await spec.prepare(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  await page.screenshot({
    path: join(OUT_DIR, `${spec.name}.png`),
    fullPage: false,
  });
  console.log(`✓ ${spec.name}.png (${viewport.width}×${viewport.height})`);
  await context.close();
}

async function captureOrderPageDevices(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const devices: Array<{ name: string; device: keyof typeof DEVICE_CAPTURES }> = [
    { name: '01-bestellseite-monitor', device: 'monitor' },
    { name: '01-bestellseite-iphone', device: 'iphone' },
    { name: '01-bestellseite-ipad', device: 'ipad' },
  ];

  for (const { name, device } of devices) {
    const viewport = DEVICE_CAPTURES[device];
    const context = await browser.newContext({
      viewport,
      locale: 'de-DE',
      isMobile: device === 'iphone',
      hasTouch: device === 'iphone' || device === 'ipad',
      ...(device === 'iphone' && { userAgent: IPHONE_UA }),
    });
    const page = await context.newPage();
    await setupPage(page, false);

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await prepareOrderPageForDevice(page, device);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const rawPath = join(RAW_DIR, `${name}.png`);
    await page.screenshot({ path: rawPath, fullPage: false });
    await context.close();

    const outPath = join(OUT_DIR, `${name}.png`);
    embedDevice(rawPath, device, outPath);
  }

  // Legacy-Dateiname für README-Kompatibilität
  const monitorPath = join(OUT_DIR, '01-bestellseite-monitor.png');
  const legacyPath = join(OUT_DIR, '01-bestellseite.png');
  if (existsSync(monitorPath)) {
    const { copyFileSync } = await import('fs');
    copyFileSync(monitorPath, legacyPath);
    console.log('✓ 01-bestellseite.png (Kopie von Monitor-Variante)');
  }
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('Frontend nicht gebaut. Bitte zuerst: cd frontend && npm run build');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(RAW_DIR, { recursive: true });
  await startStaticServer();

  const browser = await chromium.launch({ headless: true });

  await captureOrderPageDevices(browser);

  const pages: PageSpec[] = [
    { name: '02-kundenstatus', url: `/status/${ORDER_ID}` },
    {
      name: '03-status-abfrage',
      url: '/status',
      prepare: async (page) => {
        await page.getByLabel('Abholnummer').fill('42');
        await page.getByLabel('Nachname').fill('Mustermann');
      },
    },
    { name: '04-abholboard-monitor', url: '/abholboard' },
    { name: '05-mitarbeiter-login', url: '/mitarbeiter/login' },
    { name: '06-dashboard', url: '/mitarbeiter', auth: true },
    { name: '07-kuechenansicht-tablet', url: '/mitarbeiter/kueche', auth: true },
    {
      name: '08-abholung',
      url: '/mitarbeiter/abholung',
      auth: true,
      prepare: async (page) => {
        await page.getByLabel('Abholnummer').fill('43');
        await page.locator('button').filter({ has: page.locator('svg') }).last().click();
        await page.waitForTimeout(500);
      },
    },
    {
      name: '09-bestellung',
      url: '/mitarbeiter/bestellung',
      auth: true,
      prepare: async (page) => {
        await page.locator('button[aria-label="Menge erhöhen"]').first().click();
        await page.locator('button[aria-label="Menge erhöhen"]').nth(2).click();
      },
    },
    { name: '10-bestellungen', url: '/mitarbeiter/bestellungen', auth: true },
    { name: '11-speisenverwaltung', url: '/admin/speisen', auth: true },
    { name: '12-veranstaltungen', url: '/admin/veranstaltungen', auth: true },
    { name: '13-vereinseinstellungen', url: '/admin/verein', auth: true },
    { name: '14-kontakt', url: '/kontakt' },
    { name: '15-admin-login', url: '/admin/login' },
    { name: '16-admin-uebersicht', url: '/admin', auth: true },
    { name: '17-benutzerverwaltung', url: '/admin/benutzer', auth: true },
    { name: '18-bestell-einstellungen', url: '/admin/bestellung', auth: true },
    { name: '19-email-einstellungen', url: '/admin/email', auth: true },
  ];

  for (const spec of pages) {
    await captureScreenshot(browser, spec);
  }

  const oldNames = ['08-kassenansicht.png', '09-lokale-kasse.png'];
  for (const old of oldNames) {
    try {
      unlinkSync(join(OUT_DIR, old));
    } catch { /* ignore */ }
  }

  await browser.close();
  console.log(`\nScreenshots gespeichert in ${OUT_DIR} (1920×1080)`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
