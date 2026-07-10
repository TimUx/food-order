import { PrismaClient, RoleName, OrderSource, StatusCode } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';

/**
 * Umfangreicher QA-Seed: Verein, Sommerfest, Benutzer, Speisekarte, Bestellungen, Module.
 * Idempotent – kann in CI mehrfach ausgeführt werden.
 */
export async function runQaSeed(options: { orderCount?: number; demoMode?: boolean } = {}): Promise<void> {
  const orderCount = options.orderCount ?? (options.demoMode ? 50 : 10);
  console.log(`QA-Seed startet (${orderCount} Bestellungen)...`);

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: { name: RoleName.ADMIN, permissions: [] },
  });
  const staffRole = await prisma.role.upsert({
    where: { name: RoleName.STAFF },
    update: {},
    create: { name: RoleName.STAFF, permissions: [] },
  });

  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEFAULT_TENANT_ID, email: 'admin@verein.local' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      email: 'admin@verein.local',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Verein',
      roleId: adminRole.id,
    },
  });

  const staffHash = await bcrypt.hash('staff123', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEFAULT_TENANT_ID, email: 'kueche@verein.local' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      email: 'kueche@verein.local',
      passwordHash: staffHash,
      firstName: 'Küche',
      lastName: 'Mitarbeiter',
      roleId: staffRole.id,
    },
  });

  const verkaufHash = await bcrypt.hash('staff123', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEFAULT_TENANT_ID, email: 'verkauf@verein.local' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      email: 'verkauf@verein.local',
      passwordHash: verkaufHash,
      firstName: 'Verkauf',
      lastName: 'Stand',
      roleId: staffRole.id,
    },
  });

  const eventDate = new Date(Date.UTC(2026, 6, 15));
  const event = await prisma.event.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { isActive: true, onlineOrdersActive: true, cashierActive: true },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: DEFAULT_TENANT_ID,
      name: 'Sommerfest 2026',
      description: 'Jährliches Vereins-Sommerfest – QA Testdaten',
      date: eventDate,
      startTime: '11:00',
      endTime: '22:00',
      onlineOrdersActive: true,
      cashierActive: true,
      ordersClosed: false,
      isActive: true,
    },
  });

  const dishes = [
    { id: '00000000-0000-0000-0001-000000000001', name: 'Bratwurst mit Brötchen', price: 4.5, sortOrder: 1 },
    { id: '00000000-0000-0000-0001-000000000002', name: 'Currywurst', price: 6.0, sortOrder: 2 },
    { id: '00000000-0000-0000-0001-000000000003', name: 'Schnitzel mit Pommes', price: 8.5, sortOrder: 3 },
    { id: '00000000-0000-0000-0001-000000000004', name: 'Vegetarischer Burger', price: 7.0, sortOrder: 4 },
    { id: '00000000-0000-0000-0001-000000000005', name: 'Apfelstrudel', price: 3.5, sortOrder: 5 },
  ];

  for (const dish of dishes) {
    await prisma.foodItem.upsert({
      where: { id: dish.id },
      update: { active: true, soldOut: false },
      create: {
        id: dish.id,
        tenantId: DEFAULT_TENANT_ID,
        eventId: event.id,
        name: dish.name,
        description: `${dish.name} – QA`,
        price: dish.price,
        sortOrder: dish.sortOrder,
        active: true,
        soldOut: false,
      },
    });
  }

  await prisma.clubSettings.upsert({
    where: { tenantId: DEFAULT_TENANT_ID },
    update: { clubName: 'SV Musterstadt e.V.' },
    create: {
      id: `club-${DEFAULT_TENANT_ID}`,
      tenantId: DEFAULT_TENANT_ID,
      clubName: 'SV Musterstadt e.V.',
      description: 'Sportverein Musterstadt – QA',
      contactName: 'Vereinsverwaltung',
      email: 'kontakt@sv-musterstadt.de',
      phone: '+49 1234 567890',
      address: 'Sportplatzstraße 1, 12345 Musterstadt',
    },
  });

  const firstDish = dishes[0];
  for (let i = 1; i <= orderCount; i++) {
    const orderId = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (existing) continue;

    const qty = (i % 3) + 1;
    const lineTotal = firstDish.price * qty;
    let customerId: string | undefined;
    if (i % 3 !== 0) {
      const customer = await prisma.customer.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          firstName: 'Test',
          lastName: `Kunde${i}`,
          email: i % 2 === 0 ? `kunde${i}@example.test` : null,
        },
      });
      customerId = customer.id;
    }
    await prisma.order.create({
      data: {
        id: orderId,
        tenantId: DEFAULT_TENANT_ID,
        lookupToken: crypto.randomBytes(32).toString('hex'),
        eventId: event.id,
        orderNumber: i,
        orderDate: eventDate,
        source: i % 5 === 0 ? OrderSource.CASHIER : OrderSource.ONLINE,
        status: i % 4 === 0 ? StatusCode.READY : StatusCode.NEW,
        totalPrice: lineTotal,
        customerId,
        items: {
          create: [{
            foodItemId: firstDish.id,
            quantity: qty,
            unitPrice: firstDish.price,
            lineTotal,
          }],
        },
        statusHistory: { create: { status: StatusCode.NEW } },
      },
    });
  }

  console.log(`QA-Seed abgeschlossen (${orderCount} Bestellungen).`);
}

if (process.argv[1]?.includes('qa-seed')) {
  runQaSeed({ orderCount: Number(process.env.QA_ORDER_COUNT ?? 10), demoMode: process.env.QA_DEMO_MODE === '1' })
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
