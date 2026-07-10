/**
 * Seeds many orders for event-day performance benchmarks.
 * Usage: cd backend && npx tsx ../scripts/qa/seed-performance-orders.ts [count]
 */
import { PrismaClient, OrderSource, StatusCode } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const FOOD_ITEM_ID = '00000000-0000-0000-0001-000000000001';
const TARGET = Number(process.argv[2] ?? 1000);

const STATUSES: StatusCode[] = ['NEW', 'IN_PROGRESS', 'READY', 'PICKED_UP'];

async function main() {
  const existing = await prisma.order.count({
    where: { tenantId: TENANT_ID, eventId: EVENT_ID, status: { not: 'CANCELLED' } },
  });
  const toCreate = Math.max(0, TARGET - existing);
  console.log(`Existing: ${existing}, creating: ${toCreate} (target ${TARGET})`);

  const foodItem = await prisma.foodItem.findFirst({
    where: { id: FOOD_ITEM_ID, tenantId: TENANT_ID },
  });
  if (!foodItem) {
    throw new Error('Food item not found — run prisma seed first');
  }

  const orderDate = new Date(Date.UTC(2026, 6, 15));
  const batchSize = 100;

  for (let offset = 0; offset < toCreate; offset += batchSize) {
    const batch = Math.min(batchSize, toCreate - offset);
    await prisma.$transaction(
      Array.from({ length: batch }, (_, i) => {
        const n = existing + offset + i + 1;
        const status = STATUSES[n % STATUSES.length];
        const readyAt = status === 'READY' || status === 'PICKED_UP' ? new Date() : null;
        return prisma.order.create({
          data: {
            tenantId: TENANT_ID,
            eventId: EVENT_ID,
            lookupToken: crypto.randomBytes(16).toString('hex'),
            orderNumber: 10000 + n,
            orderDate,
            source: OrderSource.ONLINE,
            status,
            totalPrice: foodItem.price,
            readyAt,
            pickedUpAt: status === 'PICKED_UP' ? new Date() : null,
            items: {
              create: [{
                foodItemId: FOOD_ITEM_ID,
                quantity: 1,
                unitPrice: foodItem.price,
                lineTotal: foodItem.price,
              }],
            },
            statusHistory: { create: { status } },
          },
        });
      })
    );
    console.log(`  … ${offset + batch} / ${toCreate}`);
  }

  const total = await prisma.order.count({
    where: { tenantId: TENANT_ID, eventId: EVENT_ID, status: { not: 'CANCELLED' } },
  });
  console.log(`Done. Non-cancelled orders for event: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
