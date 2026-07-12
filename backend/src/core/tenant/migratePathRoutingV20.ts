import { prisma } from '../../config/database';

/**
 * Aktiviert Pfad-basiertes Mandanten-Routing (v2.0) und bereinigt Wildcard-Domain-Einstellungen.
 */
export async function migratePathRoutingV20(): Promise<void> {
  await prisma.platformSettings.upsert({
    where: { key: 'platform.routing.pathPrefixEnabled' },
    update: { value: true },
    create: { key: 'platform.routing.pathPrefixEnabled', value: true },
  });

  await prisma.platformSettings.upsert({
    where: { key: 'platform.wildcardDomain' },
    update: { value: '' },
    create: { key: 'platform.wildcardDomain', value: '' },
  });

  await prisma.platformSettings.upsert({
    where: { key: 'platform.network.allowWildcardSubdomains' },
    update: { value: false },
    create: { key: 'platform.network.allowWildcardSubdomains', value: false },
  });
}
