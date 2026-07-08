import path from 'path';
import { pathToFileURL } from 'url';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { Module } from './types';
import type { ModuleManifest } from './manifest';

/**
 * Loads module instances from the filesystem.
 * Modules are pre-built into the Docker image – no runtime installation.
 */
export class ModuleLoader {
  private resolveEntryPath(manifest: ModuleManifest): string {
    const base = path.join(config.modulesDir, manifest.id, manifest.entry);
    // tsx dev resolves .ts; production uses compiled .js in dist/modules
    const distBase = path.join(config.modulesDistDir, manifest.id, manifest.entry);

    if (config.nodeEnv === 'production') {
      return distBase.endsWith('.js') ? distBase : `${distBase}.js`;
    }
    return base.endsWith('.ts') ? base : `${base}.ts`;
  }

  async load(manifest: ModuleManifest): Promise<Module> {
    const entryPath = this.resolveEntryPath(manifest);

    try {
      const mod = await import(pathToFileURL(entryPath).href);
      const instance = this.extractModuleInstance(mod, manifest);
      if (instance.id !== manifest.id) {
        throw new Error(`Modul-ID Mismatch: erwartet ${manifest.id}, erhalten ${instance.id}`);
      }
      return instance;
    } catch (err) {
      logger.error(`Modul ${manifest.id} konnte nicht geladen werden`, err);
      throw err;
    }
  }

  private extractModuleInstance(mod: Record<string, unknown>, manifest: ModuleManifest): Module {
    if (mod.default && typeof mod.default === 'object' && 'id' in (mod.default as object)) {
      return mod.default as Module;
    }

    const exportName = manifest.entry === 'index'
      ? `${manifest.id.replace(/-/g, '')}Module`
      : undefined;

    const camelId = manifest.id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) + 'Module';
    const candidates = [
      mod[`${manifest.id}Module`],
      mod[camelId],
      exportName ? mod[exportName] : undefined,
      ...Object.values(mod),
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object' && 'id' in candidate && 'install' in candidate) {
        return candidate as Module;
      }
    }

    throw new Error(`Kein Module-Export in ${manifest.id} gefunden`);
  }
}

export const moduleLoader = new ModuleLoader();
