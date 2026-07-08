import { createStubModule } from '../_shared/createStubModule';

const DiscountModule = createStubModule({
  id: 'discount',
  name: 'Rabatte',
  description: 'Rabattaktionen und Sonderpreise',
  permissions: [
    { key: 'discount.manage', description: 'Rabatte verwalten' },
    { key: 'discount.apply', description: 'Rabatte anwenden' },
  ],
});

export const discountModule = new DiscountModule();
