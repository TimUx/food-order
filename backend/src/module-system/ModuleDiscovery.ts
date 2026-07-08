import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { moduleManifestSchema, type ModuleManifest } from './manifest';

/**
 * Scans /modules (and future /plugins) for module.json manifests.
 * No modules are downloaded – all ship with the Docker image.
 */
export class ModuleDiscovery {
  private scanDirectory(dir: string, source: 'official' | 'community'): ModuleManifest[] {
    if (!fs.existsSync(dir)) {
      logger.warn(`Modulverzeichnis nicht gefunden: ${dir}`);
      return [];
    }

    const manifests: ModuleManifest[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;

      const manifestPath = path.join(dir, entry.name, 'module.json');
      if (!fs.existsSync(manifestPath)) {
        logger.warn(`Kein module.json in ${entry.name} (${source})`);
        continue;
      }

      try {
        const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const manifest = moduleManifestSchema.parse(raw);
        if (manifest.id !== entry.name) {
          logger.warn(`Modul-ID ${manifest.id} stimmt nicht mit Verzeichnis ${entry.name} überein`);
        }
        manifests.push(manifest);
        logger.info(`Manifest gelesen: ${manifest.id} v${manifest.version} (${source})`);
      } catch (err) {
        logger.error(`Ungültiges Manifest in ${entry.name}`, err);
      }
    }

    return manifests;
  }

  discover(): ModuleManifest[] {
    const official = this.scanDirectory(config.modulesDir, 'official');
    // Community plugins – reserved for future use
    const community = this.scanDirectory(config.pluginsDir, 'community');
    return [...official, ...community];
  }

  getManifestPath(moduleId: string): string | null {
    for (const dir of [config.modulesDir, config.pluginsDir]) {
      const p = path.join(dir, moduleId, 'module.json');
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
}

export const moduleDiscovery = new ModuleDiscovery();
