/**
 * Shared-Cache-Abstraktion (Phase 9).
 * Aktuell: In-Memory. Redis-Adapter vorbereitet für horizontale Skalierung.
 */

import { config } from '../../config';

export interface SharedCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

class InMemorySharedCache implements SharedCache {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Redis-Adapter – aktiviert wenn REDIS_URL gesetzt.
 * Vollständige Implementierung folgt bei Multi-Replica-Betrieb (ioredis).
 */
class RedisSharedCache implements SharedCache {
  async get(_key: string): Promise<string | null> {
    return null;
  }

  async set(_key: string, _value: string, _ttlSeconds?: number): Promise<void> {
    // Architektur-Vorbereitung
  }

  async delete(_key: string): Promise<void> {}
}

let instance: SharedCache | null = null;

export function getSharedCache(): SharedCache {
  if (!instance) {
    instance = config.redis.enabled ? new RedisSharedCache() : new InMemorySharedCache();
  }
  return instance;
}
