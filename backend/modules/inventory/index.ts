import { createStubModule } from '../_shared/createStubModule';

const InventoryModule = createStubModule({
  id: 'inventory',
  name: 'Lagerverwaltung',
  description: 'Bestandsführung und Lagerbestände für Speisen und Getränke',
  permissions: [
    { key: 'inventory.view', description: 'Lagerbestände einsehen' },
    { key: 'inventory.edit', description: 'Lagerbestände bearbeiten' },
  ],
});

export const inventoryModule = new InventoryModule();
