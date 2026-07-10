/** Minimale OpenAPI-Beschreibung der Kern-API (M6). */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'FestManager API',
    version: '2.0.0',
    description: 'REST-API für Online-Bestellungen, Mitarbeiter- und Admin-Bereich.',
  },
  servers: [{ url: '/api', description: 'API-Basis' }],
  paths: {
    '/health': {
      get: { summary: 'Health Check', responses: { '200': { description: 'OK' } } },
    },
    '/auth/login': {
      post: { summary: 'Anmeldung', responses: { '200': { description: 'Token' }, '401': { description: 'Ungültig' } } },
    },
    '/public/menu': {
      get: { summary: 'Öffentliche Speisekarte' },
    },
    '/public/orders': {
      post: { summary: 'Online-Bestellung erstellen' },
    },
    '/public/orders/lookup': {
      post: { summary: 'Bestellung per Abholnummer + Nachname suchen' },
    },
    '/staff/events': {
      get: { summary: 'Veranstaltungen (Mitarbeiter)' },
    },
    '/admin/settings': {
      get: { summary: 'Settings-Namespaces' },
    },
    '/admin/modules': {
      get: { summary: 'Modulübersicht' },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
} as const;
