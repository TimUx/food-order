import { createStubModule } from '../_shared/createStubModule';

const CheckinModule = createStubModule({
  id: 'checkin',
  name: 'QR-Code Einlass',
  description: 'Einlasskontrolle per QR-Code',
  permissions: [
    { key: 'checkin.scan', description: 'QR-Codes scannen' },
    { key: 'checkin.manage', description: 'Einlasseinstellungen verwalten' },
  ],
});

export const checkinModule = new CheckinModule();
