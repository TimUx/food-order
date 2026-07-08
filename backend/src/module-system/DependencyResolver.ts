import type { ModuleManifest } from './manifest';
import { moduleRegistry } from './ModuleRegistry';

export class DependencyResolver {
  checkRequired(manifest: ModuleManifest): { ok: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const depId of manifest.dependencies.required) {
      const dep = moduleRegistry.getModule(depId);
      if (!dep) {
        missing.push(depId);
        continue;
      }
      // Dependency must be installed and activated
      void dep;
    }

    return { ok: missing.length === 0, missing };
  }

  async checkRequiredActivated(
    manifest: ModuleManifest,
    isActivated: (id: string) => Promise<boolean>
  ): Promise<{ ok: boolean; missing: string[]; inactive: string[] }> {
    const missing: string[] = [];
    const inactive: string[] = [];

    for (const depId of manifest.dependencies.required) {
      if (!moduleRegistry.getModule(depId)) {
        missing.push(depId);
        continue;
      }
      if (!(await isActivated(depId))) {
        inactive.push(depId);
      }
    }

    return { ok: missing.length === 0 && inactive.length === 0, missing, inactive };
  }

  getDependents(moduleId: string, manifests: ModuleManifest[]): string[] {
    return manifests
      .filter((m) => m.dependencies.required.includes(moduleId))
      .map((m) => m.id);
  }
}

export const dependencyResolver = new DependencyResolver();
