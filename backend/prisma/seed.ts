import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';

async function main() {
  console.log('Seeding Datenbank...');

  await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {
      name: 'SV Musterstadt e.V.',
      shortName: 'SVM',
      status: 'ACTIVE',
      activatedAt: new Date(),
    },
    create: {
      id: DEFAULT_TENANT_ID,
      name: 'SV Musterstadt e.V.',
      shortName: 'SVM',
      slug: 'default',
      subdomain: 'default',
      status: 'ACTIVE',
      contactName: 'Vereinsverwaltung',
      email: 'kontakt@sv-musterstadt.de',
      phone: '+49 1234 567890',
      description: 'Sportverein Musterstadt – seit 1920',
      address: 'Sportplatzstraße 1, 12345 Musterstadt',
      website: 'https://www.sv-musterstadt.de',
      activatedAt: new Date(),
      settings: { create: {} },
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: { permissions: [] },
    create: { name: RoleName.ADMIN, permissions: [] },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: RoleName.STAFF },
    update: { permissions: [] },
    create: { name: RoleName.STAFF, permissions: [] },
  });

  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEFAULT_TENANT_ID, email: 'admin@verein.local' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      email: 'admin@verein.local',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Verein',
      roleId: adminRole.id,
    },
  });

  const staffPassword = await bcrypt.hash('staff123', 12);
  const kuechePermissions = ['orders.view', 'orders.kitchen', 'printer.print'];
  const kassePermissions = ['orders.view', 'orders.manage', 'payment.view'];

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEFAULT_TENANT_ID, email: 'kueche@verein.local' } },
    update: {
      permissions: kuechePermissions,
      roleTemplate: 'kueche',
    },
    create: {
      tenantId: DEFAULT_TENANT_ID,
      email: 'kueche@verein.local',
      passwordHash: staffPassword,
      firstName: 'Küche',
      lastName: 'Mitarbeiter',
      roleId: staffRole.id,
      permissions: kuechePermissions,
      roleTemplate: 'kueche',
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEFAULT_TENANT_ID, email: 'kasse@verein.local' } },
    update: {
      permissions: kassePermissions,
      roleTemplate: 'kasse',
    },
    create: {
      tenantId: DEFAULT_TENANT_ID,
      email: 'kasse@verein.local',
      passwordHash: staffPassword,
      firstName: 'Kasse',
      lastName: 'Mitarbeiter',
      roleId: staffRole.id,
      permissions: kassePermissions,
      roleTemplate: 'kasse',
    },
  });

  const today = new Date();
  const eventDate = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() + 14
  ));

  const event = await prisma.event.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { isActive: true },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: DEFAULT_TENANT_ID,
      name: 'Sommerfest 2026',
      description: 'Jährliches Vereins-Sommerfest mit leckerem Essen',
      date: eventDate,
      startTime: '11:00',
      endTime: '22:00',
      onlineOrdersActive: true,
      cashierActive: true,
      ordersClosed: false,
      isActive: true,
    },
  });

  const foodItems = [
    {
      name: 'Bratwurst mit Brötchen',
      description: 'Frische Bratwurst vom Grill mit Senf und Brötchen',
      price: 4.5,
      sortOrder: 1,
    },
    {
      name: 'Currywurst',
      description: 'Currywurst mit Pommes und hausgemachter Soße',
      price: 6.0,
      sortOrder: 2,
    },
    {
      name: 'Schnitzel mit Pommes',
      description: 'Paniertes Schnitzel mit knusprigen Pommes',
      price: 8.5,
      sortOrder: 3,
    },
    {
      name: 'Vegetarischer Burger',
      description: 'Gemüseburger mit Salat und hausgemachter Soße',
      price: 7.0,
      sortOrder: 4,
    },
    {
      name: 'Apfelstrudel',
      description: 'Warmer Apfelstrudel mit Vanillesauce',
      price: 3.5,
      sortOrder: 5,
    },
  ];

  for (const item of foodItems) {
    await prisma.foodItem.upsert({
      where: {
        id: `00000000-0000-0000-0001-${item.sortOrder.toString().padStart(12, '0')}`,
      },
      update: {},
      create: {
        id: `00000000-0000-0000-0001-${item.sortOrder.toString().padStart(12, '0')}`,
        tenantId: DEFAULT_TENANT_ID,
        eventId: event.id,
        name: item.name,
        description: item.description,
        price: item.price,
        sortOrder: item.sortOrder,
        active: true,
        soldOut: false,
      },
    });
  }

  await prisma.clubSettings.upsert({
    where: { tenantId: DEFAULT_TENANT_ID },
    update: {
      clubName: 'SV Musterstadt e.V.',
      description: 'Sportverein Musterstadt – seit 1920',
      contactName: 'Vereinsverwaltung',
      email: 'kontakt@sv-musterstadt.de',
      phone: '+49 1234 567890',
      address: 'Sportplatzstraße 1, 12345 Musterstadt',
      website: 'https://www.sv-musterstadt.de',
    },
    create: {
      id: `club-${DEFAULT_TENANT_ID}`,
      tenantId: DEFAULT_TENANT_ID,
      clubName: 'SV Musterstadt e.V.',
      description: 'Sportverein Musterstadt – seit 1920',
      contactName: 'Vereinsverwaltung',
      email: 'kontakt@sv-musterstadt.de',
      phone: '+49 1234 567890',
      address: 'Sportplatzstraße 1, 12345 Musterstadt',
      website: 'https://www.sv-musterstadt.de',
    },
  });

  console.log('Seed abgeschlossen!');
  console.log('');
  console.log('Test-Zugangsdaten:');
  console.log('  Admin:  admin@verein.local / admin123');
  console.log('  Küche:  kueche@verein.local / staff123');
  console.log('  Kasse:  kasse@verein.local / staff123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
