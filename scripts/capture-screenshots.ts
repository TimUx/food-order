/**
 * Erstellt Screenshots aller Ansichten für die Dokumentation.
 * Verwendet API-Mocking mit realistischen Beispieldaten.
 */
import { chromium, Page } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

const PORT = 4173;
const OUT_DIR = join(process.cwd(), 'docs', 'screenshots');
const DIST = join(process.cwd(), 'frontend', 'dist');

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

function mockApi(pathname: string, method: string, body?: string): unknown {
  if (pathname === '/api/public/club' || pathname === '/api/staff/club') return mockClub;
  if (pathname === '/api/public/menu') {
    return { event: mockEvent, items: mockFoodItems, preOrderInfo: 'Vorbestellung möglich' };
  }
  if (pathname === '/api/public/event') return mockEvent;
  if (pathname === `/api/public/orders/${ORDER_ID}`) {
    return { ...mockOrders[1] };
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

interface PageSpec {
  name: string;
  url: string;
  viewport?: { width: number; height: number };
  auth?: boolean;
  prepare?: (page: Page) => Promise<void>;
  fullPage?: boolean;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('Frontend nicht gebaut. Bitte zuerst: cd frontend && npm run build');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  await startStaticServer();

  const browser = await chromium.launch({ headless: true });

  const pages: PageSpec[] = [
    {
      name: '01-bestellseite',
      url: '/',
      viewport: { width: 1280, height: 900 },
      prepare: async (page) => {
        await page.getByLabel('Vorname *').fill('Max');
        await page.getByLabel('Nachname *').fill('Mustermann');
        await page.locator('button[aria-label="Menge erhöhen"]').first().click();
        await page.locator('button[aria-label="Menge erhöhen"]').first().click();
        await page.locator('button[aria-label="Menge erhöhen"]').nth(1).click();
      },
    },
    {
      name: '02-kundenstatus',
      url: `/status/${ORDER_ID}`,
    },
    {
      name: '03-status-abfrage',
      url: '/status',
      prepare: async (page) => {
        await page.getByLabel('Abholnummer').fill('42');
        await page.getByLabel('Nachname').fill('Mustermann');
      },
    },
    { name: '04-abholboard-monitor', url: '/abholboard', viewport: { width: 1920, height: 1080 }, fullPage: false },
    { name: '05-mitarbeiter-login', url: '/mitarbeiter/login' },
    { name: '06-dashboard', url: '/mitarbeiter', auth: true, viewport: { width: 1280, height: 800 } },
    { name: '07-kuechenansicht-tablet', url: '/mitarbeiter/kueche', viewport: { width: 1024, height: 768 }, auth: true },
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
    { name: '11-speisenverwaltung', url: '/mitarbeiter/speisen', auth: true },
    { name: '12-veranstaltungen', url: '/mitarbeiter/veranstaltungen', auth: true },
    { name: '13-vereinseinstellungen', url: '/mitarbeiter/verein', auth: true },
    { name: '14-kontakt', url: '/kontakt' },
  ];

  for (const spec of pages) {
    const context = await browser.newContext({
      viewport: spec.viewport || { width: 1280, height: 800 },
      locale: 'de-DE',
    });
    const page = await context.newPage();
    await setupPage(page, spec.auth);

    await page.goto(`http://localhost:${PORT}${spec.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    if (spec.prepare) await spec.prepare(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    await page.screenshot({
      path: join(OUT_DIR, `${spec.name}.png`),
      fullPage: spec.fullPage === true,
    });
    console.log(`✓ ${spec.name}.png`);
    await context.close();
  }

  // Alte Dateinamen entfernen
  const oldNames = ['08-kassenansicht.png', '09-lokale-kasse.png'];
  for (const old of oldNames) {
    try {
      const { unlinkSync } = await import('fs');
      unlinkSync(join(OUT_DIR, old));
    } catch { /* ignore */ }
  }

  await browser.close();
  console.log(`\nScreenshots gespeichert in ${OUT_DIR}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
