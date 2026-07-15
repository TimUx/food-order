import { userRepository } from '../../../src/repositories';

/** E-Mail-Adressen aktiver Admins mit aktivierter Benachrichtigungs-Option (je Mandant). */
export async function getTenantAdminNotificationEmails(): Promise<string[]> {
  const users = await userRepository.findAdminNotificationSubscribers();
  const emails = users
    .map((user) => user.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));
  return [...new Set(emails)];
}
