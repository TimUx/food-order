import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { ALL_PLATFORM_PERMISSIONS } from '../../platform/platformPermissions';
import { config } from '../../config';

const DEFAULT_PLATFORM_ADMIN_EMAIL = 'platform@festmanager.local';

/**
 * Stellt sicher, dass mindestens ein Plattformadministrator existiert.
 */
export async function ensurePlatformAdmin(): Promise<void> {
  const existing = await prisma.platformUser.count();
  if (existing > 0) return;

  const passwordFromEnv = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!passwordFromEnv && config.nodeEnv === 'production') {
    throw new Error(
      'PLATFORM_ADMIN_PASSWORD muss gesetzt sein, bevor der erste Plattformadministrator angelegt wird.'
    );
  }
  const password = passwordFromEnv || 'platform-admin-change-me';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.platformUser.create({
    data: {
      email: process.env.PLATFORM_ADMIN_EMAIL || DEFAULT_PLATFORM_ADMIN_EMAIL,
      passwordHash,
      firstName: 'Plattform',
      lastName: 'Administrator',
      active: true,
      permissions: ALL_PLATFORM_PERMISSIONS,
    },
  });
}
