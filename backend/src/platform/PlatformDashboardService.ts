import os from 'os';
import fs from 'fs';
import { prisma } from '../config/database';
import { config } from '../config';
import type { PlatformContext } from './tenant/PlatformContext';

export class PlatformDashboardService {
  constructor(private readonly platformContext: PlatformContext) {}

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      tenantCount,
      activeTenants,
      suspendedTenants,
      archivedTenants,
      userCount,
      activeEvents,
      ordersToday,
      platformUsers,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      prisma.tenant.count({ where: { status: 'ARCHIVED' } }),
      prisma.user.count({ where: { active: true } }),
      prisma.event.count({ where: { isActive: true } }),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.platformUser.count({ where: { active: true } }),
    ]);

    const platform = this.platformContext.current();
    const mem = process.memoryUsage();
    const load = os.loadavg();

    return {
      tenants: {
        total: tenantCount,
        active: activeTenants,
        suspended: suspendedTenants,
        archived: archivedTenants,
      },
      users: { total: userCount, platformAdmins: platformUsers },
      events: { active: activeEvents },
      orders: { today: ordersToday },
      platform: {
        status: platform.maintenanceMode ? 'maintenance' : 'operational',
        version: platform.platformVersion,
        name: platform.platformName,
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMb: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        },
        loadAverage: load.map((v) => Math.round(v * 100) / 100),
        nodeVersion: process.version,
        cpus: os.cpus().length,
      },
      backups: {
        lastBackup: null as string | null,
        strategy: 'manual',
      },
      health: {
        database: await this.checkDatabase(),
        defaultTenant: await prisma.tenant.count({ where: { slug: 'default' } }) > 0,
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export class PlatformMonitoringService {
  async getOverview() {
    const mem = process.memoryUsage();
    const uploadsDir = config.uploadsDir;

    let uploadSizeMb = 0;
    try {
      const fs = await import('fs');
      const path = await import('path');
      const root = path.resolve(uploadsDir);
      if (fs.existsSync(root)) {
        uploadSizeMb = await this.dirSizeMb(root);
      }
    } catch {
      /* ignore */
    }

    const moduleCount = await prisma.tenantModule.count({ where: { enabled: true } });
    const dbPing = await this.pingDb();
    const { getSocketStats } = await import('../socket');
    const { performanceMetrics } = await import('./metrics/performanceMetrics');

    return {
      cpu: { cores: os.cpus().length, loadAverage: os.loadavg() },
      memory: {
        totalMb: Math.round(os.totalmem() / 1024 / 1024),
        freeMb: Math.round(os.freemem() / 1024 / 1024),
        processRssMb: Math.round(mem.rss / 1024 / 1024),
      },
      database: dbPing,
      docker: { detected: fsExists('/.dockerenv') },
      websockets: getSocketStats(),
      storage: { uploadsMb: uploadSizeMb, uploadsDir },
      modules: { enabledInstallations: moduleCount },
      jobs: { backgroundJobs: 0, queue: 'sync' },
      api: { topSlowEndpoints: performanceMetrics.getApiSummary(10) },
    };
  }

  private async pingDb(): Promise<{ connected: boolean; latencyMs: number }> {
    const start = performance.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { connected: true, latencyMs: Math.round(performance.now() - start) };
    } catch {
      return { connected: false, latencyMs: -1 };
    }
  }

  private async dirSizeMb(dir: string): Promise<number> {
    const fs = await import('fs');
    const path = await import('path');
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += await this.dirSizeMb(full);
      } else {
        total += fs.statSync(full).size;
      }
    }
    return Math.round(total / 1024 / 1024);
  }
}

function fsExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}
