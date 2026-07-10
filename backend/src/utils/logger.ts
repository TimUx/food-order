import { config } from '../config';

type LogLevel = 'info' | 'warn' | 'error';

function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...meta,
  };

  if (config.logFormat === 'json') {
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
    return;
  }

  const payload = meta && Object.keys(meta).length > 0 ? meta : '';
  if (level === 'error') console.error(`[ERROR] ${entry.time} ${message}`, payload);
  else if (level === 'warn') console.warn(`[WARN] ${entry.time} ${message}`, payload);
  else console.log(`[INFO] ${entry.time} ${message}`, payload);
}

export const logger = {
  withTenant(meta?: Record<string, unknown>, tenantId?: string): Record<string, unknown> | undefined {
    if (!meta && !tenantId) return undefined;
    return { ...(meta ?? {}), ...(tenantId ? { tenant_id: tenantId } : {}) };
  },

  info(message: string, meta?: unknown, tenantId?: string) {
    const payload =
      typeof meta === 'object' && meta !== null && !Array.isArray(meta)
        ? this.withTenant(meta as Record<string, unknown>, tenantId)
        : tenantId
          ? { tenant_id: tenantId, meta }
          : (meta as Record<string, unknown> | undefined);
    writeLog('info', message, payload);
  },

  warn(message: string, meta?: unknown, tenantId?: string) {
    const payload =
      typeof meta === 'object' && meta !== null && !Array.isArray(meta)
        ? this.withTenant(meta as Record<string, unknown>, tenantId)
        : tenantId
          ? { tenant_id: tenantId, meta }
          : (meta as Record<string, unknown> | undefined);
    writeLog('warn', message, payload);
  },

  error(message: string, error?: unknown, tenantId?: string) {
    writeLog(
      'error',
      message,
      tenantId ? { tenant_id: tenantId, error: String(error) } : { error: String(error) }
    );
  },
};
