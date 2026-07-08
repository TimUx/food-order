import { prisma } from '../config/database';
import { featureFlags } from './FeatureFlags';
import { featureHooks } from './FeatureHooks';
import type { FeatureContext } from './types';

class FeatureContextImpl implements FeatureContext {
  readonly hooks = featureHooks;
  readonly flags = featureFlags;

  async getConfig<T = Record<string, unknown>>(moduleId: string): Promise<T> {
    const row = await prisma.installedModule.findUnique({ where: { moduleId } });
    return (row?.configJson as T) ?? ({} as T);
  }

  async setConfig<T = Record<string, unknown>>(moduleId: string, config: T): Promise<void> {
    await prisma.installedModule.upsert({
      where: { moduleId },
      create: {
        moduleId,
        configJson: config as object,
        installed: false,
        enabled: false,
      },
      update: { configJson: config as object },
    });
  }
}

export const featureContext: FeatureContext = new FeatureContextImpl();
