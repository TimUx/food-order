import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Datenbank...');

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: { name: RoleName.ADMIN },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: RoleName.STAFF },
    update: {},
    create: { name: RoleName.STAFF },
  });

  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@verein.local' },
    update: {},
    create: {
      email: 'admin@verein.local',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Verein',
      roleId: adminRole.id,
    },
  });

  const staffPassword = await bcrypt.hash('staff123', 12);
  await prisma.user.upsert({
    where: { email: 'kueche@verein.local' },
    update: {},
    create: {
      email: 'kueche@verein.local',
      passwordHash: staffPassword,
      firstName: 'Küche',
      lastName: 'Mitarbeiter',
      roleId: staffRole.id,
    },
  });

  const today = new Date();
  const eventDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const event = await prisma.event.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { isActive: true },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
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

  console.log('Seed abgeschlossen!');
  console.log('');
  console.log('Test-Zugangsdaten:');
  console.log('  Admin:  admin@verein.local / admin123');
  console.log('  Küche:  kueche@verein.local / staff123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
