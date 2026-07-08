import { createStubModule } from '../_shared/createStubModule';

const LoyaltyModule = createStubModule({
  id: 'loyalty',
  name: 'Treueprogramm',
  description: 'Stammkundenprogramm mit Punkten und Belohnungen',
  permissions: [
    { key: 'loyalty.manage', description: 'Treueprogramm verwalten' },
    { key: 'loyalty.view', description: 'Treuepunkte einsehen' },
  ],
});

export const loyaltyModule = new LoyaltyModule();
