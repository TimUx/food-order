import { createStubModule } from '../_shared/createStubModule';

const NotificationsModule = createStubModule({
  id: 'notifications',
  name: 'Benachrichtigungen',
  description: 'E-Mail, Push und ntfy Benachrichtigungen',
  permissions: [
    { key: 'notifications.settings', description: 'Benachrichtigungseinstellungen verwalten' },
    { key: 'notifications.send', description: 'Benachrichtigungen senden' },
  ],
});

export const notificationsModule = new NotificationsModule();
