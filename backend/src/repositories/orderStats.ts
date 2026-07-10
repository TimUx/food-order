import { StatusCode } from '@prisma/client';
import { prisma } from '../config/database';
import { requireTenantId, tenantWhere } from '../platform/tenant/tenantScope';

export interface OrderEventStats {
  totalOrders: number;
  openOrders: number;
  readyOrders: number;
  pickedUpOrders: number;
  revenue: number;
  popularDishes: { name: string; count: number }[];
  avgProcessingMinutes: number;
}

export function buildOrderEventStats(input: {
  statusCounts: Partial<Record<StatusCode, number>>;
  revenue: number;
  popularDishes: { name: string; count: number }[];
  avgProcessingMinutes: number;
}): OrderEventStats {
  const totalOrders = Object.values(input.statusCounts).reduce((sum, n) => sum + n, 0);
  const openOrders =
    (input.statusCounts.NEW ?? 0) + (input.statusCounts.IN_PROGRESS ?? 0);

  return {
    totalOrders,
    openOrders,
    readyOrders: input.statusCounts.READY ?? 0,
    pickedUpOrders: input.statusCounts.PICKED_UP ?? 0,
    revenue: input.revenue,
    popularDishes: input.popularDishes,
    avgProcessingMinutes: input.avgProcessingMinutes,
  };
}

/**
 * Event dashboard stats via DB aggregations — bounded payload, no full order load.
 */
export async function getOrderEventStats(eventId: string): Promise<OrderEventStats> {
  const baseWhere = tenantWhere({ eventId, status: { not: StatusCode.CANCELLED } });
  const tenantId = requireTenantId();

  const [statusGroups, revenueAgg, popularGroups, avgRow] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: baseWhere,
      _sum: { totalPrice: true },
    }),
    prisma.orderItem.groupBy({
      by: ['foodItemId'],
      where: { order: baseWhere },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.$queryRaw<[{ avg_minutes: number | null }]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("ready_at" - "created_at")) / 60.0)::float AS avg_minutes
      FROM "Order"
      WHERE "tenant_id" = ${tenantId}
        AND "event_id" = ${eventId}
        AND "status"::text != 'CANCELLED'
        AND "ready_at" IS NOT NULL
    `,
  ]);

  const statusCounts: Partial<Record<StatusCode, number>> = {};
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
  }

  let popularDishes: { name: string; count: number }[] = [];
  if (popularGroups.length > 0) {
    const foodItems = await prisma.foodItem.findMany({
      where: tenantWhere({ id: { in: popularGroups.map((g) => g.foodItemId) } }),
      select: { id: true, name: true },
    });
    const nameMap = new Map(foodItems.map((f) => [f.id, f.name]));
    popularDishes = popularGroups.map((g) => ({
      name: nameMap.get(g.foodItemId) ?? 'Unbekannt',
      count: g._sum.quantity ?? 0,
    }));
  }

  return buildOrderEventStats({
    statusCounts,
    revenue: Number(revenueAgg._sum.totalPrice ?? 0),
    popularDishes,
    avgProcessingMinutes: Math.round(avgRow[0]?.avg_minutes ?? 0),
  });
}
