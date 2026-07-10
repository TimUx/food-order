import type { CorsOptions } from 'cors';
import { config } from '../config';
import type { PlatformContextData } from '../platform/tenant/types';

/**
 * Zentrale CORS-Policy: Plattformsettings + Wildcard-Subdomains + Dev-Fallback.
 */
class CorsPolicy {
  private explicitOrigins: string[] = [];
  private baseDomain = config.multiTenant.baseDomain;
  private allowWildcardSubdomains = true;

  constructor() {
    this.explicitOrigins = [config.corsOrigin];
    this.baseDomain = config.multiTenant.baseDomain;
  }

  bindFromPlatform(
    platform: PlatformContextData,
    networkSettings?: Record<string, unknown>
  ): void {
    this.baseDomain = platform.baseDomain;
    const origins = networkSettings?.corsOrigins;
    if (Array.isArray(origins) && origins.every((o) => typeof o === 'string')) {
      this.explicitOrigins = origins as string[];
    }
    if (typeof networkSettings?.allowWildcardSubdomains === 'boolean') {
      this.allowWildcardSubdomains = networkSettings.allowWildcardSubdomains;
    }
  }

  isAllowed(origin: string | undefined): boolean {
    if (!origin) return true;

    if (this.explicitOrigins.includes(origin) || this.explicitOrigins.includes('*')) {
      return true;
    }

    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();

      if (host === 'localhost' || host === '127.0.0.1') return true;

      if (this.allowWildcardSubdomains) {
        if (host === this.baseDomain.toLowerCase()) return true;
        if (host.endsWith(`.${this.baseDomain.toLowerCase()}`)) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  corsOptions(): CorsOptions {
    return {
      origin: (origin, callback) => {
        callback(null, this.isAllowed(origin));
      },
      credentials: true,
    };
  }

  socketOrigins(): string[] | boolean {
    if (this.explicitOrigins.includes('*')) return true;
    return this.explicitOrigins;
  }
}

export const corsPolicy = new CorsPolicy();
