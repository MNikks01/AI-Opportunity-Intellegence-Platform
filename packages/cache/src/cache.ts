/**
 * Cache-aside helper over a minimal Redis-like client. Every Redis call is wrapped so a cache outage
 * degrades to the source (never throws) — the cache is an optimization, never a dependency.
 */
import { logger } from "@aioi/logger";

/** The subset of ioredis this cache uses (also satisfied by test fakes). */
export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttlSeconds: number): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  del(...keys: string[]): Promise<number>;
}

export interface Cache {
  cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T>;
  invalidate(prefix: string): Promise<void>;
}

export function createCache(client: CacheClient): Cache {
  return {
    async cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
      try {
        const hit = await client.get(key);
        if (hit !== null) return JSON.parse(hit) as T;
      } catch (err) {
        logger.warn({ err, key }, "cache read failed — falling through to source");
      }
      const value = await loader();
      try {
        await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
      } catch (err) {
        logger.warn({ err, key }, "cache write failed");
      }
      return value;
    },

    async invalidate(prefix: string): Promise<void> {
      try {
        const keys = await client.keys(`${prefix}*`);
        if (keys.length > 0) await client.del(...keys);
      } catch (err) {
        logger.warn({ err, prefix }, "cache invalidate failed");
      }
    },
  };
}
