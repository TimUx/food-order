import { createStubModule } from '../_shared/createStubModule';

const AnalyticsModule = createStubModule({
  id: 'analytics',
  name: 'Auswertungen',
  description: 'Statistiken und Berichte zu Bestellungen und Veranstaltungen',
  permissions: [
    { key: 'analytics.view', description: 'Auswertungen einsehen' },
    { key: 'analytics.export', description: 'Berichte exportieren' },
  ],
});

export const analyticsModule = new AnalyticsModule();
