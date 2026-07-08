import path from 'path';
import { config } from '../../../src/config';
import { prisma } from '../../../src/config/database';
import { logger } from '../../../src/utils/logger';
import fs from 'fs';

export async function runPaymentMigrations(): Promise<void> {
  const migrationsDir = path.join(config.modulesDir, 'payment', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`Payment migrations nicht gefunden: ${migrationsDir}`);
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
    logger.info(`Payment migration ausgeführt: ${file}`);
  }
}
