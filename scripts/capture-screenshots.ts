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

import { tmpdir } from 'os';

const PORT = 4173;
const OUT_DIR = join(process.cwd(), 'docs', 'screenshots');
const RAW_DIR = join(tmpdir(), 'festschmiede-screenshots-raw');
const DIST = process.env.FRONTEND_DIST ?? join(process.cwd(), 'frontend', 'dist');
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
const ORDER_LOOKUP_TOKEN = 'a1b2c3d4e5f6789012345678abcdef12';

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
  clubName: 'Feuerwehr Musterstadt',
  description: 'Freiwillige Feuerwehr Musterstadt – Tradition seit 1892',
  contactName: 'Vereinsvorstand Max Müller',
  email: 'kontakt@feuerwehr-musterstadt.de',
  phone: '+49 1234 567890',
  address: 'Feuerwehrstraße 1, 12345 Musterstadt',
  website: 'https://www.feuerwehr-musterstadt.de',
  logoUrl: null,
  orderFieldFirstNameRequired: true,
  orderFieldLastNameRequired: true,
  orderFieldEmailRequired: false,
  orderFieldPhoneRequired: false,
  cancellationDeadlineHours: 24,
};

const mockEmailSettings = {
  smtpHost: 'smtp.feuerwehr-musterstadt.de',
  smtpPort: 587,
  smtpUser: 'noreply@feuerwehr-musterstadt.de',
  smtpFrom: 'noreply@feuerwehr-musterstadt.de',
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
  { id: '00000000-0000-0000-0001-000000000001', eventId: EVENT_ID, name: 'Bratwurst', description: 'Frische Bratwurst vom Grill mit Senf', price: 4.5, sortOrder: 1, active: true, soldOut: false },
  { id: '00000000-0000-0000-0001-000000000002', eventId: EVENT_ID, name: 'Pommes', description: 'Knusprige Pommes frites', price: 3.5, sortOrder: 2, active: true, soldOut: false },
  { id: '00000000-0000-0000-0001-000000000003', eventId: EVENT_ID, name: 'Steak', description: 'Rumpsteak vom Grill mit Kräuterbutter', price: 12.0, sortOrder: 3, active: true, soldOut: false },
  { id: '00000000-0000-0000-0001-000000000004', eventId: EVENT_ID, name: 'Cola', description: 'Erfrischungsgetränk 0,33 l', price: 2.5, sortOrder: 4, active: true, soldOut: false },
  { id: '00000000-0000-0000-0001-000000000005', eventId: EVENT_ID, name: 'Apfelwein', description: 'Regionaler Apfelwein 0,25 l', price: 3.0, sortOrder: 5, active: true, soldOut: false },
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
    { id: 'i1', foodItemId: mockFoodItems[0].id, name: 'Bratwurst', quantity: 2, unitPrice: 4.5, lineTotal: 9 },
    { id: 'i2', foodItemId: mockFoodItems[1].id, name: 'Pommes', quantity: 1, unitPrice: 3.5, lineTotal: 3.5 },
  ],
};

const mockOrders = [
  { ...mockOrderBase, id: '00000000-0000-0000-0000-000000000041', lookupToken: 'b1b2c3d4e5f6789012345678abcdef01', orderNumber: 41, displayNumber: '041', status: 'NEW', statusLabel: 'Neu' },
  { ...mockOrderBase, id: '00000000-0000-0000-0000-000000000042', lookupToken: ORDER_LOOKUP_TOKEN, orderNumber: 42, displayNumber: '042', status: 'IN_PROGRESS', statusLabel: 'In Bearbeitung' },
  { ...mockOrderBase, id: '00000000-0000-0000-0000-000000000043', lookupToken: 'c1b2c3d4e5f6789012345678abcdef03', orderNumber: 43, displayNumber: '043', status: 'READY', statusLabel: 'Fertig', totalPrice: 12.0, items: [{ id: 'i3', foodItemId: mockFoodItems[2].id, name: 'Steak', quantity: 1, unitPrice: 12, lineTotal: 12 }] },
  { ...mockOrderBase, id: '00000000-0000-0000-0000-000000000044', lookupToken: 'd1b2c3d4e5f6789012345678abcdef04', orderNumber: 44, displayNumber: '044', status: 'PICKED_UP', statusLabel: 'Abgeholt', source: 'CASHIER', sourceLabel: 'Vor Ort' },
];

const mockStats = {
  totalOrders: 87,
  openOrders: 12,
  readyOrders: 5,
  pickedUpOrders: 68,
  revenue: 1243.5,
  popularDishes: [
    { name: 'Bratwurst', count: 45 },
    { name: 'Pommes', count: 38 },
    { name: 'Steak', count: 28 },
    { name: 'Cola', count: 52 },
    { name: 'Apfelwein', count: 19 },
  ],
  avgProcessingMinutes: 8,
};

const mockUser = { id: 'u1', email: 'admin@verein.local', firstName: 'Admin', lastName: 'Verein', role: 'ADMIN' };

const mockModuleMenu = [
  { id: 'payment-admin', label: 'Payment', path: '/admin/payment', icon: 'Payment', parentId: 'modules', sortOrder: 10, requiredPermission: 'payment.view' },
  { id: 'notifications-settings', label: 'Notifications', path: '/admin/settings/module.notifications', icon: 'Notifications', parentId: 'modules', sortOrder: 20, requiredPermission: 'notifications.settings' },
  { id: 'legal-admin', label: 'Rechtliche Informationen', path: '/admin/legal', icon: 'Gavel', parentId: 'modules', sortOrder: 30, requiredPermission: 'legal.view' },
];

const mockModules = [
  {
    id: 'payment', name: 'Online-Zahlung', version: '1.0.0', imageVersion: '1.0.0',
    description: 'Online-Zahlungen über Stripe und weitere Anbieter',
    author: 'FestSchmiede', license: 'MIT', status: 'ENABLED', installed: true, enabled: true,
    productionReady: true,
    flags: { enabled: true, disabled: false, configurable: true, visible: true, health: 'healthy' },
    permissions: [
      { key: 'payment.view', description: 'Zahlungsübersicht einsehen' },
      { key: 'payment.manage', description: 'Zahlungsarten verwalten' },
      { key: 'payment.refund', description: 'Rückerstattungen durchführen' },
      { key: 'payment.provider.configure', description: 'Anbieter konfigurieren' },
      { key: 'payment.statistics', description: 'Statistiken einsehen' },
    ],
    menuItems: mockModuleMenu, widgets: [], hasConfig: true,
    dependencies: { required: [], optional: [] }, minimumCoreVersion: '1.0.0',
    installedAt: '2026-01-15T10:00:00.000Z', lastHealthStatus: 'healthy', upgradeAvailable: false,
    settingsPath: '/admin/payment?tab=presets',
  },
  {
    id: 'notifications', name: 'Benachrichtigungen', version: '1.0.0', imageVersion: '1.0.0',
    description: 'E-Mail, Push und ntfy Benachrichtigungen',
    author: 'FestSchmiede', license: 'MIT', status: 'ENABLED', installed: true, enabled: true,
    productionReady: true,
    flags: { enabled: true, disabled: false, configurable: true, visible: true, health: 'healthy' },
    permissions: [], menuItems: [], widgets: [], hasConfig: true,
    dependencies: { required: [], optional: [] }, minimumCoreVersion: '1.0.0',
    installedAt: '2026-02-01T12:00:00.000Z', upgradeAvailable: false,
    settingsPath: '/admin/settings/module.notifications',
  },
  {
    id: 'legal', name: 'Rechtliche Informationen', version: '1.4.0', imageVersion: '1.4.0',
    description: 'Impressum, Datenschutz, AGB und Widerruf',
    author: 'FestSchmiede', license: 'MIT', status: 'ENABLED', installed: true, enabled: true,
    productionReady: true,
    flags: { enabled: true, disabled: false, configurable: true, visible: true, health: 'healthy' },
    permissions: [
      { key: 'legal.view', description: 'Rechtliche Informationen einsehen' },
      { key: 'legal.manage', description: 'Rechtliche Informationen bearbeiten' },
      { key: 'legal.publish', description: 'Rechtliche Informationen veroeffentlichen' },
    ],
    menuItems: [{ id: 'legal-admin', label: 'Rechtliche Informationen', path: '/admin/legal', icon: 'Gavel', parentId: 'modules', sortOrder: 30, requiredPermission: 'legal.view' }],
    widgets: [], hasConfig: true,
    dependencies: { required: [], optional: ['notifications'] }, minimumCoreVersion: '1.0.0',
    installedAt: '2026-07-09T08:00:00.000Z', lastHealthStatus: 'healthy', upgradeAvailable: false,
    settingsPath: '/admin/legal?tab=settings',
  },
  {
    id: 'printer', name: 'Bondruck', version: '1.0.0', imageVersion: '1.0.0',
    description: 'Automatischer Bondruck für Küche und Kasse',
    author: 'FestSchmiede', license: 'MIT', status: 'DISABLED', installed: true, enabled: false,
    productionReady: true,
    flags: { enabled: false, disabled: true, configurable: true, visible: true, health: 'unknown' },
    permissions: [], menuItems: [], widgets: [], hasConfig: true,
    dependencies: { required: [], optional: [] }, minimumCoreVersion: '1.0.0',
    installedAt: '2026-03-01T08:00:00.000Z', upgradeAvailable: false,
    settingsPath: '/admin/settings/module.printer',
  },
];

const mockPaymentConfig = {
  defaultProvider: 'stripe',
  onlinePaymentForEvents: true,
  allowCashOnSite: true,
  stripe: {
    enabled: true,
    sandbox: true,
    publishableKey: 'pk_test_51Muster••••Key',
    secretKey: 'sk_test_51M••••Key',
    webhookSecret: 'whsec_••••••••',
  },
  paypal: { enabled: false, sandbox: true },
  vrPayment: { enabled: false },
  sPayment: { enabled: false },
  payone: { enabled: false },
  sumup: { enabled: false },
};

const mockPaymentDashboard = {
  stats: {
    paymentsToday: 12,
    revenueTodayCents: 15600,
    openPayments: 2,
    failedPayments: 1,
    timeouts: 0,
    refunds: 0,
  },
  activeProviders: 1,
  availableMethods: 3,
  providers: [
    { id: 'stripe', name: 'Kartenzahlung', implemented: true, status: 'sandbox', health: { ok: true, message: 'Stripe verbunden (Testmodus)' } },
  ],
  webhookStatus: 'ok',
  healthStatus: 'ok',
  recentErrors: [],
};

const mockPaymentProviders = [
  {
    id: 'stripe', name: 'Kartenzahlung', description: 'Kreditkarte, Apple Pay, Google Pay',
    version: '1.0.0', implemented: true, enabled: true, configured: true, sandbox: true,
    status: 'sandbox', health: { ok: true, message: 'Stripe verbunden (Testmodus)' },
    supportsRefund: true, supportsWebhook: true,
  },
];

const mockPaymentSettingsForm = {
  namespace: 'module.payment',
  label: 'Online-Zahlung',
  description: 'Zahlungsanbieter und API-Schlüssel',
  adminPath: '/admin/settings/module.payment',
  groups: [
    {
      id: 'general', label: 'Allgemein', fields: [
        { key: 'onlinePaymentForEvents', group: 'general', label: 'Online-Zahlung für Veranstaltungen', type: 'boolean', value: true },
        { key: 'allowCashOnSite', group: 'general', label: 'Barzahlung vor Ort anbieten', type: 'boolean', value: true },
      ],
    },
    {
      id: 'stripe', label: 'Stripe', fields: [
        { key: 'stripe.enabled', group: 'stripe', label: 'Stripe aktivieren', type: 'boolean', value: true },
        { key: 'stripe.sandbox', group: 'stripe', label: 'Testmodus (Sandbox)', type: 'boolean', value: true },
        { key: 'stripe.publishableKey', group: 'stripe', label: 'Öffentlicher API-Schlüssel', type: 'string', value: 'pk_test_51Muster••••Key' },
        { key: 'stripe.secretKey', group: 'stripe', label: 'Geheimer API-Schlüssel', type: 'password', value: '', masked: true, encrypted: true },
        { key: 'stripe.webhookSecret', group: 'stripe', label: 'Webhook-Signatur', type: 'password', value: '', masked: true, encrypted: true, helpText: 'Wird vom Zahlungsanbieter bereitgestellt.' },
      ],
    },
  ],
};

const mockNotificationsSettingsForm = {
  namespace: 'module.notifications',
  label: 'Benachrichtigungen',
  description: 'E-Mail (SMTP), ntfy, Discord, Slack und Teams',
  adminPath: '/admin/settings/module.notifications',
  groups: [
    {
      id: 'smtp', label: 'SMTP / E-Mail', fields: [
        { key: 'smtp.enabled', group: 'smtp', label: 'SMTP aktivieren', type: 'boolean', value: true },
        { key: 'smtp.host', group: 'smtp', label: 'SMTP-Host', type: 'string', value: 'smtp.feuerwehr-musterstadt.de' },
        { key: 'smtp.port', group: 'smtp', label: 'SMTP-Port', type: 'number', value: 587 },
        { key: 'smtp.from', group: 'smtp', label: 'Absender-Adresse', type: 'email', value: 'noreply@feuerwehr-musterstadt.de' },
        { key: 'smtp.pass', group: 'smtp', label: 'SMTP-Passwort', type: 'password', value: '', masked: true, encrypted: true },
      ],
    },
  ],
};

const mockLegalImprintHtml = [
  '<h1>Impressum</h1>',
  '<p>Angaben gemaess § 5 TMG</p>',
  '<p><strong>Feuerwehr Musterstadt e.V.</strong><br>Feuerwehrstraße 1<br>12345 Musterstadt</p>',
  '<p>Vertreten durch: Max Mueller (1. Vorsitzender)</p>',
].join('');

const mockLegalAdminPages = [
  {
    pageType: 'imprint', title: 'Impressum', slug: 'impressum', enabled: true, published: true,
    contentHtml: mockLegalImprintHtml, hasContent: true, isPubliclyVisible: true,
    updatedAt: '2026-07-09T10:00:00.000Z',
  },
  {
    pageType: 'privacy', title: 'Datenschutzerklaerung', slug: 'datenschutz', enabled: true, published: false,
    contentHtml: '', hasContent: false, isPubliclyVisible: false,
    updatedAt: '2026-07-09T09:00:00.000Z',
  },
  {
    pageType: 'terms', title: 'Allgemeine Geschaeftsbedingungen', slug: 'agb', enabled: false, published: false,
    contentHtml: '', hasContent: false, isPubliclyVisible: false,
    updatedAt: '2026-07-09T09:00:00.000Z',
  },
  {
    pageType: 'withdrawal', title: 'Widerrufsbelehrung', slug: 'widerruf', enabled: false, published: false,
    contentHtml: '', hasContent: false, isPubliclyVisible: false,
    updatedAt: '2026-07-09T09:00:00.000Z',
  },
];

const mockLegalConfig = {
  appendClubContactToImprint: true,
  showFooterLinks: true,
  showNotificationLinks: true,
};

const mockPublicLegalLinks = {
  links: [
    { pageType: 'imprint', title: 'Impressum', slug: 'impressum', path: '/impressum' },
  ],
};

const mockPublicImprintPage = {
  pageType: 'imprint',
  title: 'Impressum',
  slug: 'impressum',
  html: `${mockLegalImprintHtml}<section><h2>Kontakt</h2><p><strong>Feuerwehr Musterstadt</strong></p><p>Ansprechpartner: Vereinsvorstand Max Müller</p><p>E-Mail: <a href="mailto:kontakt@feuerwehr-musterstadt.de">kontakt@feuerwehr-musterstadt.de</a></p></section>`,
  updatedAt: '2026-07-09T10:00:00.000Z',
};

const mockClubSettingsForm = {
  namespace: 'core.club',
  label: 'Veranstalter',
  description: 'Öffentliche Veranstalterdaten und Branding',
  adminPath: '/admin/verein',
  groups: [
    {
      id: 'general', label: 'Allgemein', description: 'Name und Beschreibung', fields: [
        { key: 'clubName', group: 'general', label: 'Name des Veranstalters', type: 'string', value: mockClub.clubName, required: true },
        { key: 'description', group: 'general', label: 'Beschreibung', type: 'text', value: mockClub.description },
      ],
    },
    {
      id: 'contact', label: 'Kontakt', description: 'Kontaktdaten für die öffentliche Seite', fields: [
        { key: 'contactName', group: 'contact', label: 'Ansprechpartner', type: 'string', value: mockClub.contactName },
        { key: 'email', group: 'contact', label: 'E-Mail', type: 'email', value: mockClub.email },
        { key: 'phone', group: 'contact', label: 'Telefon', type: 'string', value: mockClub.phone },
        { key: 'address', group: 'contact', label: 'Adresse', type: 'text', value: mockClub.address },
      ],
    },
    {
      id: 'branding', label: 'Branding', description: 'Logo und Website', fields: [
        { key: 'website', group: 'branding', label: 'Website', type: 'url', value: mockClub.website },
        { key: 'logoUrl', group: 'branding', label: 'Logo-URL', type: 'url', value: mockClub.logoUrl ?? '' },
      ],
    },
  ],
};

const mockOrderSettingsForm = {
  namespace: 'core.order',
  label: 'Bestellung',
  description: 'Pflichtfelder und Stornierungsfrist für Online-Bestellungen',
  adminPath: '/admin/bestellung',
  groups: [
    {
      id: 'fields', label: 'Pflichtfelder', description: 'Welche Kundendaten abgefragt werden', fields: [
        { key: 'orderFieldFirstNameRequired', group: 'fields', label: 'Vorname Pflichtfeld', type: 'boolean', value: mockClub.orderFieldFirstNameRequired },
        { key: 'orderFieldLastNameRequired', group: 'fields', label: 'Nachname Pflichtfeld', type: 'boolean', value: mockClub.orderFieldLastNameRequired },
        { key: 'orderFieldEmailRequired', group: 'fields', label: 'E-Mail Pflichtfeld', type: 'boolean', value: mockClub.orderFieldEmailRequired },
        { key: 'orderFieldPhoneRequired', group: 'fields', label: 'Telefon Pflichtfeld', type: 'boolean', value: mockClub.orderFieldPhoneRequired },
      ],
    },
    {
      id: 'cancellation', label: 'Stornierung', description: 'Frist für Kundenstornierung', fields: [
        { key: 'cancellationDeadlineHours', group: 'cancellation', label: 'Stornierungsfrist (Stunden vor Veranstaltung)', type: 'number', value: mockClub.cancellationDeadlineHours },
      ],
    },
  ],
};

const mockAdminPages = [
  { id: 'admin-dashboard', path: '/admin', label: 'Übersicht', description: 'Administrationsübersicht', icon: 'Dashboard', pageType: 'dashboard', sortOrder: 0, source: 'core' as const },
  { id: 'core-events', path: '/admin/veranstaltungen', label: 'Veranstaltungen', description: 'Veranstaltungen anlegen und aktivieren', icon: 'Event', pageType: 'builtin', componentId: 'core.events', sortOrder: 10, source: 'core' as const },
  { id: 'core-food-items', path: '/admin/speisen', label: 'Speisen', description: 'Speisekarte pflegen', icon: 'RestaurantMenu', pageType: 'builtin', componentId: 'core.food-items', sortOrder: 20, source: 'core' as const },
  { id: 'core-users', path: '/admin/benutzer', label: 'Team', description: 'Mitarbeiter und Administratoren', icon: 'People', pageType: 'builtin', componentId: 'core.users', sortOrder: 25, source: 'core' as const },
  { id: 'core-modules', path: '/admin/module', label: 'Funktionen', description: 'Zahlung, Benachrichtigungen und Druck', icon: 'Extension', pageType: 'modules', componentId: 'core.modules', sortOrder: 30, source: 'core' as const },
  { id: 'payment-admin', path: '/admin/payment', label: 'Online-Zahlung', description: 'Zahlungsanbieter, Transaktionen und Statistiken', icon: 'Payment', pageType: 'report', componentId: 'payment.admin', sortOrder: 35, source: 'module' as const, moduleId: 'payment', requiredPermission: 'payment.view' },
  { id: 'legal-admin', path: '/admin/legal', label: 'Rechtliche Informationen', description: 'Impressum, Datenschutz, AGB und Widerruf', icon: 'Gavel', pageType: 'report', componentId: 'legal.admin', sortOrder: 36, source: 'module' as const, moduleId: 'legal', requiredPermission: 'legal.view' },
  { id: 'settings-core-club', path: '/admin/verein', label: 'Veranstalter', description: 'Öffentliche Veranstalterdaten und Branding', icon: 'Settings', pageType: 'settings', namespace: 'core.club', sortOrder: 1, source: 'core' as const },
  { id: 'settings-core-order', path: '/admin/bestellung', label: 'Bestellung', description: 'Pflichtfelder und Stornierungsfrist', icon: 'ShoppingCart', pageType: 'settings', namespace: 'core.order', sortOrder: 2, source: 'core' as const },
  { id: 'settings-module.notifications', path: '/admin/settings/module.notifications', label: 'Benachrichtigungen', description: 'E-Mail, Push und ntfy', icon: 'Notifications', pageType: 'settings', namespace: 'module.notifications', sortOrder: 3, source: 'module' as const, moduleId: 'notifications' },
];

const mockAdminUi = {
  navigation: [
    { id: 'admin-dashboard', label: 'Übersicht', path: '/admin', icon: 'Dashboard', sortOrder: 0, source: 'core' },
    { id: 'core-events', label: 'Veranstaltungen', path: '/admin/veranstaltungen', icon: 'Event', sortOrder: 10, source: 'core' },
    { id: 'core-food-items', label: 'Speisen', path: '/admin/speisen', icon: 'RestaurantMenu', sortOrder: 20, source: 'core' },
    { id: 'core-users', label: 'Team', path: '/admin/benutzer', icon: 'People', sortOrder: 25, source: 'core' },
    { id: 'core-modules', label: 'Funktionen', path: '/admin/module', icon: 'Extension', sortOrder: 30, source: 'core' },
    { id: 'settings-core-club', label: 'Veranstalter', path: '/admin/verein', icon: 'Settings', parentId: 'settings', sortOrder: 1, source: 'core' },
    { id: 'settings-core-order', label: 'Bestellung', path: '/admin/bestellung', icon: 'ShoppingCart', parentId: 'settings', sortOrder: 2, source: 'core' },
    { id: 'settings-module.notifications', label: 'Benachrichtigungen', path: '/admin/settings/module.notifications', icon: 'Notifications', parentId: 'settings', sortOrder: 3, source: 'module', moduleId: 'notifications' },
  ],
  pages: mockAdminPages,
  dashboardTiles: [
    ...mockAdminPages
      .filter((p) => p.pageType !== 'dashboard')
      .map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
        path: p.path,
        icon: p.icon,
        sortOrder: p.sortOrder,
        source: p.source,
        moduleId: 'moduleId' in p ? p.moduleId : undefined,
      })),
    {
      id: 'staff-area',
      label: 'Mitarbeiterbereich',
      description: 'Küche, Abholung, Bestellungen',
      path: '/mitarbeiter',
      icon: 'Storefront',
      sortOrder: 1000,
      source: 'core' as const,
    },
  ],
  widgets: [{ id: 'payment-status', title: 'Online-Zahlung', componentId: 'payment.status', sortOrder: 10, moduleId: 'payment' }],
  health: [{ id: 'payment-providers', moduleId: 'payment', label: 'Zahlungsanbieter', status: 'healthy', description: 'Stripe verbunden (Testmodus)' }],
  reports: [
    { id: 'payment-admin', path: '/admin/payment', label: 'Online-Zahlung', componentId: 'payment.admin', moduleId: 'payment' },
    { id: 'legal-admin', path: '/admin/legal', label: 'Rechtliche Informationen', componentId: 'legal.admin', moduleId: 'legal' },
  ],
  developerPages: [],
};

const mockUsers = [
  { id: 'u1', email: 'admin@verein.local', firstName: 'Admin', lastName: 'Verein', role: 'ADMIN', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'u2', email: 'kueche@verein.local', firstName: 'Küche', lastName: 'Team', role: 'STAFF', active: true, createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 'u3', email: 'service@verein.local', firstName: 'Service', lastName: 'Muster', role: 'STAFF', active: false, createdAt: '2026-02-15T00:00:00.000Z' },
];

function mockApi(pathname: string, method: string, body?: string, searchParams?: URLSearchParams): unknown {
  const etag = searchParams?.get('etag') ?? undefined;
  const serverTime = new Date().toISOString();

  if (pathname.match(/^\/api\/realtime\/events\/[^/]+\/orders/)) {
    const status = searchParams?.get('status');
    let orders = mockOrders;
    if (status) {
      const statuses = status.split(',').filter(Boolean);
      if (statuses.length > 0) orders = mockOrders.filter((o) => statuses.includes(o.status));
    }
    const nextEtag = `orders-${orders.length}`;
    if (etag === nextEtag) return { changed: false, etag: nextEtag, serverTime };
    return { changed: true, etag: nextEtag, serverTime, data: orders };
  }
  if (pathname.match(/^\/api\/realtime\/events\/[^/]+\/stats/)) {
    const nextEtag = 'stats-v1';
    if (etag === nextEtag) return { changed: false, etag: nextEtag, serverTime };
    return { changed: true, etag: nextEtag, serverTime, data: mockStats };
  }
  if (pathname === '/api/realtime/pickup-board') {
    const board = [
      { id: mockOrders[2].id, orderNumber: 43, displayNumber: '043', readyAt: '2026-07-08T11:00:00.000Z' },
      { id: '00000000-0000-0000-0000-000000000045', orderNumber: 45, displayNumber: '045', readyAt: '2026-07-08T11:05:00.000Z' },
    ];
    const nextEtag = 'pickup-v1';
    if (etag === nextEtag) return { changed: false, etag: nextEtag, serverTime };
    return { changed: true, etag: nextEtag, serverTime, data: board };
  }
  if (pathname === '/api/realtime/club') {
    const nextEtag = 'club-v1';
    if (etag === nextEtag) return { changed: false, etag: nextEtag, serverTime };
    return { changed: true, etag: nextEtag, serverTime, data: mockClub };
  }

  if (pathname === '/api/public/legal-links') return mockPublicLegalLinks;
  if (pathname === '/api/public/legal/impressum') return mockPublicImprintPage;
  if (pathname === '/api/modules/features/legal/admin/pages') return mockLegalAdminPages;
  if (pathname === '/api/modules/features/legal/admin/preview' && method === 'POST') {
    const parsed = body ? JSON.parse(body) as { contentHtml?: string } : {};
    return { html: parsed.contentHtml || mockLegalImprintHtml };
  }
  if (pathname === '/api/admin/modules/legal/config') return mockLegalConfig;
  if (pathname === '/api/admin/email-settings') return mockEmailSettings;
  if (pathname === '/api/public/club' || pathname === '/api/staff/club' || pathname === '/api/admin/club') return mockClub;
  if (pathname === '/api/admin/ui') return mockAdminUi;
  if (pathname === '/api/admin/settings/core.club/schema') return mockClubSettingsForm;
  if (pathname === '/api/admin/settings/core.club') return mockClub;
  if (pathname === '/api/admin/settings/core.order/schema') return mockOrderSettingsForm;
  if (pathname === '/api/admin/settings/core.order') return {
    orderFieldFirstNameRequired: mockClub.orderFieldFirstNameRequired,
    orderFieldLastNameRequired: mockClub.orderFieldLastNameRequired,
    orderFieldEmailRequired: mockClub.orderFieldEmailRequired,
    orderFieldPhoneRequired: mockClub.orderFieldPhoneRequired,
    cancellationDeadlineHours: mockClub.cancellationDeadlineHours,
  };
  if (pathname === '/api/admin/settings/module.payment/schema') return mockPaymentSettingsForm;
  if (pathname === '/api/admin/settings/module.payment') return mockPaymentConfig;
  if (pathname === '/api/admin/settings/module.notifications/schema') return mockNotificationsSettingsForm;
  if (pathname === '/api/admin/settings/module.notifications') return { smtp: mockEmailSettings };
  if (pathname === '/api/public/payment/methods') {
    return {
      allowCashOnSite: true,
      methods: [{ methodId: 'stripe:card', displayName: 'Online bezahlen', description: 'Kreditkarte', checkoutType: 'redirect', sortOrder: 10, recommended: true, supportedMethods: ['card'] }],
    };
  }
  if (pathname === '/api/public/menu') {
    return { event: mockEvent, items: mockFoodItems, preOrderInfo: 'Vorbestellung möglich' };
  }
  if (pathname === '/api/public/event') return mockEvent;
  if (pathname.match(/^\/api\/public\/orders\/status\/[^/]+$/)) {
    const token = decodeURIComponent(pathname.split('/').pop() ?? '');
    const order = mockOrders.find((o) => o.lookupToken === token);
    if (!order) return {};
    return {
      ...order,
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
      { id: '00000000-0000-0000-0000-000000000047', orderNumber: 47, displayNumber: '047', readyAt: '2026-07-08T11:10:00.000Z' },
      { id: '00000000-0000-0000-0000-000000000048', orderNumber: 48, displayNumber: '048', readyAt: '2026-07-08T11:12:00.000Z' },
      { id: '00000000-0000-0000-0000-000000000049', orderNumber: 49, displayNumber: '049', readyAt: '2026-07-08T11:15:00.000Z' },
    ];
  }
  if (pathname === '/api/public/orders/lookup' && method === 'POST') {
    return mockOrders[1];
  }
  if (pathname === '/api/auth/login') {
    return { token: 'mock-token', refreshToken: 'mock-refresh-token', user: mockUser };
  }
  if (pathname === '/api/auth/refresh') {
    return { token: 'mock-token', refreshToken: 'mock-refresh-token' };
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
  if (pathname === '/api/admin/permissions') {
    return {
      available: [
        { key: 'orders.view', description: 'Bestellungen einsehen' },
        { key: 'orders.manage', description: 'Bestellungen bearbeiten' },
        { key: 'payment.view', description: 'Zahlungsübersicht einsehen' },
      ],
      staff: ['orders.view', 'orders.manage'],
    };
  }
  if (pathname === '/api/admin/modules' && method === 'GET') return mockModules;
  if (pathname === '/api/public/modules/menu') return mockModuleMenu;
  if (pathname === '/api/public/payment/status') return { available: true };
  if (pathname === '/api/modules/features/payment/admin/dashboard') return mockPaymentDashboard;
  if (pathname === '/api/modules/features/payment/admin/providers') return mockPaymentProviders;
  if (pathname === '/api/modules/features/payment/admin/method-types') return [
    { id: 'stripe:card', providerId: 'stripe', label: 'Kreditkarte', enabled: true, recommended: true, sortOrder: 10, providerConfigured: true },
    { id: 'stripe:apple_pay', providerId: 'stripe', label: 'Apple Pay', enabled: true, recommended: false, sortOrder: 20, providerConfigured: true },
  ];
  if (pathname === '/api/modules/features/payment/admin/config') return mockPaymentConfig;
  if (pathname === '/api/modules/features/payment/admin/payments') {
    return {
      items: [
        { id: 'pay-1', orderId: mockOrders[0].id, displayNumber: '041', amountCents: 1500, status: 'PAYMENT_PAID', provider: 'stripe', createdAt: '2026-07-08T10:30:00.000Z' },
        { id: 'pay-2', orderId: mockOrders[1].id, displayNumber: '042', amountCents: 1500, status: 'PAYMENT_PENDING', provider: 'stripe', createdAt: '2026-07-08T10:45:00.000Z' },
      ],
      total: 2, page: 1, pageSize: 20,
    };
  }
  if (pathname === '/api/modules/features/payment/admin/logs') {
    return { items: [{ id: 'log-1', action: 'checkout_created', message: 'Checkout erstellt', createdAt: '2026-07-08T10:30:00.000Z' }], total: 1, page: 1 };
  }
  if (pathname === '/api/modules/features/payment/admin/webhooks') {
    return { items: [{ id: 'wh-1', event: 'payment_intent.succeeded', status: 'ok', createdAt: '2026-07-08T10:31:00.000Z' }], total: 1, page: 1 };
  }
  if (pathname === '/api/modules/features/payment/admin/health') return mockPaymentProviders;
  if (pathname === '/api/modules/features/payment/admin/statistics') {
    return { period: 'today', totalRevenueCents: 15600, paymentCount: 12, byProvider: [{ provider: 'stripe', count: 12, revenueCents: 15600 }] };
  }
  if (pathname === '/api/modules/features/payment/admin/refunds') {
    return { items: [], total: 0, page: 1 };
  }
  if (pathname.match(/\/admin\/modules\/[^/]+\/(install|activate|deactivate|uninstall|reinitialize)$/) && method === 'POST') {
    return mockModules[0];
  }
  if (pathname.match(/\/admin\/modules\/[^/]+\/health$/)) {
    return { status: 'healthy', message: 'Stripe verbunden (Sandbox/Test)' };
  }
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
  await page.route('**/sw.js', (route) => route.abort());
  await page.route('**/workbox-*.js', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const body = mockApi(url.pathname, route.request().method(), route.request().postData() || undefined, url.searchParams);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript(() => {
    localStorage.setItem('verein_theme', 'light');
    void navigator.serviceWorker?.getRegistrations().then((regs) => {
      regs.forEach((reg) => void reg.unregister());
    });
  });
  if (auth) {
    await page.addInitScript(() => {
      localStorage.setItem('verein_token', 'mock-token');
      localStorage.setItem('verein_refresh_token', 'mock-refresh-token');
    });
  }
}

async function prepareOrderPage(page: Page) {
  await page.getByTestId('order-customer-form').scrollIntoViewIfNeeded();
  await page.getByLabel(/^Vorname/).fill('Max');
  await page.getByLabel(/^Nachname/).fill('Mustermann');
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

async function waitForAdminShell(page: Page, expectedPath: string) {
  await page.waitForFunction((path) => {
    if (window.location.pathname.replace(/\/$/, '') !== path) return false;
    const text = document.body.innerText;
    if (text.includes('Admin-Login') || text.includes('Mitarbeiter-Login')) return false;
    const drawer = document.querySelector('.MuiDrawer-paper');
    return Boolean(drawer) && text.includes('Administration') && text.length > 150;
  }, expectedPath, { timeout: 60000 });
}

function adminPathFromSpec(url: string): string {
  return url.split('?')[0].replace(/\/$/, '') || '/admin';
}

async function waitForPageReady(page: Page, spec: PageSpec) {
  if (!spec.auth) return;

  if (spec.url.startsWith('/mitarbeiter')) {
    await page.waitForURL(/\/mitarbeiter(?!\/login)/, { timeout: 30000 });
    await page.waitForFunction(() => document.body.innerText.trim().length > 80, { timeout: 30000 });
    return;
  }

  if (!spec.url.startsWith('/admin')) return;

  const adminPath = adminPathFromSpec(spec.url);
  await waitForAdminShell(page, adminPath);

  if (spec.url.startsWith('/admin/payment')) {
    await page.waitForSelector('text=Online-Zahlung', { timeout: 30000 });
    if (spec.url.includes('tab=settings')) {
      await page.waitForSelector('text=Stripe aktivieren', { timeout: 30000 });
    } else if (spec.url.includes('tab=overview') || !spec.url.includes('tab=')) {
      await page.waitForSelector('text=Zahlungen heute', { timeout: 30000 });
    }
    return;
  }

  if (adminPath === '/admin/verein') {
    await page.waitForSelector('text=Feuerwehr Musterstadt', { timeout: 30000 });
    return;
  }

  if (adminPath === '/admin/bestellung') {
    await page.waitForSelector('text=Stornierungsfrist', { timeout: 30000 });
    return;
  }

  if (adminPath === '/admin/module') {
    await page.waitForSelector('text=Funktionen', { timeout: 30000 });
    return;
  }

  if (adminPath === '/admin/legal') {
    await page.waitForSelector('text=Rechtliche Informationen', { timeout: 30000 });
    if (spec.url.includes('tab=pages')) {
      await page.waitForSelector('text=HTML-Inhalt', { timeout: 30000 });
    } else if (spec.url.includes('tab=settings')) {
      await page.waitForSelector('text=Footer der Bestellseite', { timeout: 30000 });
    } else {
      await page.waitForSelector('text=Seitenstatus', { timeout: 30000 });
    }
    return;
  }

  if (adminPath === '/admin') {
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return t.includes('Echtzeit-Verbindung')
        || t.includes('Funktionsstatus')
        || (t.includes('Veranstaltungen') && t.includes('Mitarbeiterbereich') && t.includes('Online-Zahlung'));
    }, { timeout: 90000 });
    return;
  }

  await page.waitForFunction(() => document.body.innerText.trim().length > 120, { timeout: 30000 });
}

async function captureScreenshot(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  spec: PageSpec,
) {
  const viewport = spec.viewport || FULL_HD;
  const context = await browser.newContext({ viewport, locale: 'de-DE' });
  const page = await context.newPage();
  await setupPage(page, spec.auth);

  await page.goto(`http://localhost:${PORT}${spec.url}`, { waitUntil: 'domcontentloaded' });
  if (spec.auth) {
    try {
      await waitForPageReady(page, spec);
    } catch (err) {
      const debug = await page.evaluate(() => ({
        url: window.location.href,
        text: document.body.innerText.slice(0, 1200),
      }));
      console.error('Seite nicht bereit:', spec.name, debug);
      throw err;
    }
  }
  await page.waitForTimeout(600);
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

    await page.goto(`http://localhost:${PORT}/public`, { waitUntil: 'networkidle' });
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

  const startFrom = process.env.START_FROM;
  const skipDevices = process.env.SKIP_DEVICES === '1';

  if (!skipDevices && !startFrom) {
    try {
      await captureOrderPageDevices(browser);
    } catch (err) {
      console.warn('Geräte-Screenshots Bestellseite übersprungen:', err instanceof Error ? err.message : err);
    }
  }

  const pages: PageSpec[] = [
    { name: '02-kundenstatus', url: `/status/${ORDER_LOOKUP_TOKEN}`, prepare: async (page) => {
      await page.getByLabel('Nachname').fill('Mustermann');
      await page.getByRole('button', { name: 'Anzeigen' }).click();
      await page.waitForSelector('text=In Bearbeitung', { timeout: 10000 });
    } },
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
        await page.getByLabel('Nachname').fill('Mustermann');
        await page.getByRole('button', { name: 'Suchen' }).click();
        await page.waitForSelector('text=Steak', { timeout: 10000 });
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
    { name: '19-email-einstellungen', url: '/admin/settings/module.notifications', auth: true },
    { name: '20-modulverwaltung', url: '/admin/module', auth: true },
    { name: '21-payment-admin', url: '/admin/payment?tab=overview', auth: true },
    { name: '22-payment-einstellungen', url: '/admin/payment?tab=settings', auth: true },
    { name: '23-legal-admin', url: '/admin/legal?tab=overview', auth: true },
    { name: '24-legal-seiten', url: '/admin/legal?tab=pages', auth: true },
    { name: '25-impressum', url: '/impressum', prepare: async (page) => {
      await page.waitForSelector('text=Feuerwehr Musterstadt e.V.', { timeout: 10000 });
    } },
  ];

  let capturing = !startFrom;
  for (const spec of pages) {
    if (!capturing) {
      if (spec.name === startFrom || spec.name.startsWith(`${startFrom}-`)) capturing = true;
      else continue;
    }
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
