import { createStubModule } from '../_shared/createStubModule';

const VoucherModule = createStubModule({
  id: 'voucher',
  name: 'Gutscheine',
  description: 'Gutscheinverwaltung und Einlösung',
  permissions: [
    { key: 'voucher.manage', description: 'Gutscheine verwalten' },
    { key: 'voucher.redeem', description: 'Gutscheine einlösen' },
  ],
});

export const voucherModule = new VoucherModule();
