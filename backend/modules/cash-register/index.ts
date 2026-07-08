import { createStubModule } from '../_shared/createStubModule';

const CashRegisterModule = createStubModule({
  id: 'cash-register',
  name: 'Kassenanbindung',
  description: 'Anbindung an Kassensysteme und TSE',
  permissions: [
    { key: 'cash-register.settings', description: 'Kassenanbindung konfigurieren' },
    { key: 'cash-register.sync', description: 'Kassendaten synchronisieren' },
  ],
});

export const cashRegisterModule = new CashRegisterModule();
