/**
 * Bereitet die CI-Umgebung für die realistische Nutzerreise vor:
 * Mandantenbewerbungen aktivieren und Plattform-SMTP auf Mailpit zeigen.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertSetting(key: string, value: unknown, encrypted = false): Promise<void> {
  await prisma.platformSettings.upsert({
    where: { key },
    create: { key, value, encrypted },
    update: { value },
  });
}

async function main(): Promise<void> {
  await upsertSetting('platform.registration.enabled', true);
  console.log('QA: Mandantenbewerbungen aktiviert (platform.registration.enabled=true)');

  const smtpHost = process.env.QA_SMTP_HOST || 'mailpit';
  const smtpPort = Number(process.env.QA_SMTP_PORT || 1025);

  await upsertSetting('platform.smtp.enabled', true);
  await upsertSetting('platform.smtp.host', smtpHost);
  await upsertSetting('platform.smtp.port', smtpPort);
  await upsertSetting('platform.smtp.from', 'noreply@festschmiede.local');
  await upsertSetting('platform.smtp.senderName', 'FestSchmiede QA');
  await upsertSetting('platform.smtp.secure', false);
  await upsertSetting('platform.smtp.useTls', false);
  await upsertSetting('platform.smtp.user', '');
  await upsertSetting('platform.smtp.pass', '', true);
  console.log(`QA: Plattform-SMTP konfiguriert (${smtpHost}:${smtpPort})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
