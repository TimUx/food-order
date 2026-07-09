import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  modulesDir: process.env.MODULES_DIR || path.join(process.cwd(), 'modules'),
  pluginsDir: process.env.PLUGINS_DIR || path.join(process.cwd(), 'plugins'),
  modulesDistDir: process.env.MODULES_DIST_DIR || path.join(process.cwd(), 'dist', 'modules'),
  coreVersion: process.env.CORE_VERSION || '2.0.0',
  multiTenant: {
    enabled: process.env.MULTI_TENANT_ENABLED === 'true',
    defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'default',
    /** Primäre Plattformdomain – ausschließlich über ENV konfigurierbar (Default: localhost). */
    baseDomain:
      process.env.PLATFORM_DOMAIN?.trim() ||
      process.env.PLATFORM_BASE_DOMAIN?.trim() ||
      'localhost',
    wwwDomain: process.env.PLATFORM_WWW_DOMAIN?.trim() || '',
    apiDomain: process.env.PLATFORM_API_DOMAIN?.trim() || '',
    wildcardDomain: process.env.PLATFORM_WILDCARD_DOMAIN?.trim() || '',
    cookieDomain: process.env.PLATFORM_COOKIE_DOMAIN?.trim() || '',
    sessionDomain: process.env.PLATFORM_SESSION_DOMAIN?.trim() || '',
    allowedOrigins: (process.env.PLATFORM_ALLOWED_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    trustedProxies: (process.env.TRUSTED_PROXY_IPS || '127.0.0.1,::1')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    trustProxyHops: parseInt(process.env.TRUSTED_PROXY_HOPS || '1', 10),
  },
  redis: {
    url: process.env.REDIS_URL || '',
    enabled: Boolean(process.env.REDIS_URL),
  },
  logFormat: process.env.LOG_FORMAT || 'text',
};
