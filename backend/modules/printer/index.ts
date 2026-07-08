import { createStubModule } from '../_shared/createStubModule';

const PrinterModule = createStubModule({
  id: 'printer',
  name: 'Bondruck',
  description: 'Automatischer Bondruck für Küche und Kasse',
  permissions: [
    { key: 'printer.settings', description: 'Druckereinstellungen verwalten' },
    { key: 'printer.print', description: 'Belege drucken' },
  ],
});

export const printerModule = new PrinterModule();
