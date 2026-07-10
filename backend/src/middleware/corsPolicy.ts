import type { CorsOptions } from 'cors';
import { config } from '../config';
import type { PlatformContextData } from '../platform/tenant/types';

function isProductionEnv(): boolean {
  return (process.env.NODE_ENV || 'development') === 'production';
}

export interface CorsPolicySnapshot {
  explicitOrigins: string[];
  baseDomain: string;
  allowWildcardSubdomains: boolean;
}

function isLocalhostHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

function isHttpsOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === 'https:';
  } catch {
    return false;
  }
}

function originHost(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Zentrale CORS-Policy: Plattformsettings + Wildcard-Subdomains + Dev-Fallback.
 * In Produktion: kein `*`, keine localhost-Freigabe ohne explizite Origin,
 * Wildcard-Subdomains nur mit mindestens einer HTTPS-Origin.
 */
class CorsPolicy {
  private explicitOrigins: string[] = [];
  private baseDomain = config.multiTenant.baseDomain;
  private allowWildcardSubdomains = !isProductionEnv();

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
    } else if (isProductionEnv()) {
      this.allowWildcardSubdomains = false;
    }
  }

  snapshot(): CorsPolicySnapshot {
    return {
      explicitOrigins: [...this.explicitOrigins],
      baseDomain: this.baseDomain,
      allowWildcardSubdomains: this.allowWildcardSubdomains,
    };
  }

  /** Produktionsfehlkonfigurationen — leeres Array = OK. */
  validateProductionConfig(): string[] {
    if (!isProductionEnv()) return [];

    const errors: string[] = [];
    const { explicitOrigins, baseDomain, allowWildcardSubdomains } = this.snapshot();

    if (explicitOrigins.includes('*')) {
      errors.push('CORS: Wildcard (*) ist in Produktion nicht erlaubt.');
    }

    const httpsOrigins = explicitOrigins.filter(isHttpsOrigin);
    const localhostOnly =
      explicitOrigins.length > 0 &&
      explicitOrigins.every((o) => {
        const host = originHost(o);
        return host !== null && isLocalhostHost(host);
      });

    if (isLocalhostHost(baseDomain.toLowerCase())) {
      errors.push('CORS: PLATFORM_DOMAIN darf in Produktion nicht localhost sein.');
    }

    if (localhostOnly) {
      errors.push(
        'CORS: Nur localhost-Origins konfiguriert — mindestens eine explizite https://-Origin erforderlich.'
      );
    }

    if (allowWildcardSubdomains && httpsOrigins.length === 0) {
      errors.push(
        'CORS: Wildcard-Subdomains nur mit mindestens einer expliziten HTTPS-Origin erlaubt.'
      );
    }

    if (httpsOrigins.length === 0 && !allowWildcardSubdomains) {
      errors.push(
        'CORS: Keine gültigen Produktions-Origins — platform.network.corsOrigins mit https://-URLs setzen.'
      );
    }

    return errors;
  }

  isAllowed(origin: string | undefined): boolean {
    if (!origin) return true;

    if (this.explicitOrigins.includes(origin)) {
      return true;
    }

    if (this.explicitOrigins.includes('*')) {
      return !isProductionEnv();
    }

    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();

      if (isLocalhostHost(host)) {
        return !isProductionEnv() || this.explicitOrigins.includes(origin);
      }

      if (this.allowWildcardSubdomains) {
        const base = this.baseDomain.toLowerCase();
        if (host === base) return true;
        if (host.endsWith(`.${base}`)) return true;
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
    if (this.explicitOrigins.includes('*')) {
      return !isProductionEnv();
    }
    return this.explicitOrigins;
  }
}

export const corsPolicy = new CorsPolicy();
