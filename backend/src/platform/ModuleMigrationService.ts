import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { requireTenantId } from './tenant/tenantScope';
import { tenantModuleRepository } from '../repositories/tenantModuleRepository';

/**
 * Runs SQL migrations shipped with modules in the Docker image.
 * Tracks applied migrations in module_migrations – no runtime downloads.
 */
export class ModuleMigrationService {
  private migrationsDir(moduleId: string): string {
    return path.join(config.modulesDir, moduleId, 'migrations');
  }

  async runForModule(moduleId: string): Promise<number> {
    const dir = this.migrationsDir(moduleId);
    if (!fs.existsSync(dir)) {
      return 0;
    }

    const tenantId = requireTenantId();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    let applied = 0;

    for (const file of files) {
      const existing = await prisma.moduleMigration.findUnique({
        where: {
          tenantId_moduleId_migration: { tenantId, moduleId, migration: file },
        },
      });
      if (existing) continue;

      const sql = fs.readFileSync(path.join(dir, file), 'utf-8');
      const statements = sql
        .split(';')
        .map((s) =>
          s
            .split('\n')
            .filter((line) => !line.trim().startsWith('--'))
            .join('\n')
            .trim()
        )
        .filter((s) => s.length > 0);

      await prisma.$transaction(async (tx) => {
        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }

        await tx.moduleMigration.create({
          data: { tenantId, moduleId, migration: file },
        });
      });

      applied++;
      logger.info(`Modul-Migration ausgeführt: ${moduleId}/${file}`, undefined, tenantId);
    }

    if (applied > 0) {
      const latest = files[files.length - 1]?.replace(/\.sql$/, '') ?? '0';
      await tenantModuleRepository.update(moduleId, { schemaVersion: latest });
    }

    return applied;
  }

  async getAppliedMigrations(moduleId: string): Promise<string[]> {
    const rows = await prisma.moduleMigration.findMany({
      where: { tenantId: requireTenantId(), moduleId },
      orderBy: { migration: 'asc' },
    });
    return rows.map((r) => r.migration);
  }
}
