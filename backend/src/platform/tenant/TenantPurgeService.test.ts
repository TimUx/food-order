import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { TenantPurgeService, deleteTenantUploads } from './TenantPurgeService';

const tenantId = '00000000-0000-0000-0000-000000000001';

const { tx, prismaMock } = vi.hoisted(() => {
  const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
  const transactionClient = {
    platformAuditLog: { deleteMany },
    tenantApplication: { deleteMany },
    moduleMigration: { deleteMany },
    tenantModule: { deleteMany },
    order: { deleteMany },
    event: { deleteMany },
    foodItem: { deleteMany },
    customer: { deleteMany },
    user: { deleteMany },
    tenant: { delete: vi.fn() },
  };

  return {
    tx: transactionClient,
    prismaMock: {
      $executeRaw: vi.fn(),
      $transaction: vi.fn(async (fn: (client: typeof transactionClient) => Promise<void>) => fn(transactionClient)),
    },
  };
});

vi.mock('../../config/database', () => ({
  prisma: prismaMock,
}));

vi.mock('../../config', () => ({
  config: { uploadsDir: '/tmp/festschmiede-uploads-test' },
}));

describe('TenantPurgeService', () => {
  const service = new TenantPurgeService();
  let rmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    rmSpy = vi.spyOn(fs.promises, 'rm').mockResolvedValue(undefined);
    prismaMock.$executeRaw.mockResolvedValue(0);
    tx.platformAuditLog.deleteMany.mockResolvedValue({ count: 2 });
    tx.tenantApplication.deleteMany.mockResolvedValue({ count: 1 });
    tx.moduleMigration.deleteMany.mockResolvedValue({ count: 0 });
    tx.tenantModule.deleteMany.mockResolvedValue({ count: 0 });
    tx.order.deleteMany.mockResolvedValue({ count: 4 });
    tx.event.deleteMany.mockResolvedValue({ count: 1 });
    tx.foodItem.deleteMany.mockResolvedValue({ count: 2 });
    tx.customer.deleteMany.mockResolvedValue({ count: 2 });
    tx.user.deleteMany.mockResolvedValue({ count: 3 });
    tx.tenant.delete.mockResolvedValue({ id: tenantId });
  });

  afterEach(() => {
    rmSpy.mockRestore();
  });

  it('removes payment data, audit logs, applications and tenant in one transaction', async () => {
    await service.purge(tenantId);

    expect(prismaMock.$executeRaw).toHaveBeenCalled();
    expect(tx.platformAuditLog.deleteMany).toHaveBeenCalledWith({ where: { tenantId } });
    expect(tx.tenantApplication.deleteMany).toHaveBeenCalledWith({ where: { tenantId } });
    expect(tx.tenant.delete).toHaveBeenCalledWith({ where: { id: tenantId } });
  });

  it('deletes tenant upload directory after database purge', async () => {
    await service.purge(tenantId);

    expect(rmSpy).toHaveBeenCalledWith(
      `/tmp/festschmiede-uploads-test/${tenantId}`,
      { recursive: true, force: true }
    );
  });

  it('ignores missing payment schema during purge', async () => {
    prismaMock.$executeRaw.mockRejectedValueOnce({
      code: 'P2010',
      meta: { message: 'relation "payments" does not exist' },
    });

    await expect(service.purge(tenantId)).resolves.toBeUndefined();
    expect(tx.tenant.delete).toHaveBeenCalledWith({ where: { id: tenantId } });
  });
});

describe('deleteTenantUploads', () => {
  let rmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rmSpy = vi.spyOn(fs.promises, 'rm').mockResolvedValue(undefined);
  });

  afterEach(() => {
    rmSpy.mockRestore();
  });

  it('removes upload directory for tenant', async () => {
    await deleteTenantUploads(tenantId);

    expect(rmSpy).toHaveBeenCalledWith(
      `/tmp/festschmiede-uploads-test/${tenantId}`,
      { recursive: true, force: true }
    );
  });
});
