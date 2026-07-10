import helmet from 'helmet';
import { config } from '../config';

/**
 * Explizite Security-Header-Baseline (Defense in Depth neben Reverse Proxy).
 */
export function createSecurityHeadersMiddleware() {
  const isProd = config.nodeEnv === 'production';

  return helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'none'"],
          },
        }
      : false,
    hsts: isProd
      ? {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: false,
        }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  });
}

/** Erwartete Header für Security-QA (API-Responses). */
export const REQUIRED_SECURITY_HEADERS = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
] as const;
