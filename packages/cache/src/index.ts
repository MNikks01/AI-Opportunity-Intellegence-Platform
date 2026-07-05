/**
 * @aioi/cache
 * Read-model cache (cache-aside over Redis). The env-bound `cached`/`invalidate` bypass the cache in
 * tests (deterministic) and when `CACHE_DISABLED=1`. For unit tests, use `createCache(fakeClient)`.
 */
import { createCache, type Cache, type CacheClient } from "./cache";
import { getRedis } from "./client";

export { createCache, type Cache, type CacheClient };

function bypass(): boolean {
  return process.env.NODE_ENV === "test" || process.env.CACHE_DISABLED === "1";
}

let impl: Cache | undefined;
function getImpl(): Cache {
  impl ??= createCache(getRedis() as unknown as CacheClient);
  return impl;
}

export function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  if (bypass()) return loader();
  return getImpl().cached(key, ttlSeconds, loader);
}

export function invalidate(prefix: string): Promise<void> {
  if (bypass()) return Promise.resolve();
  return getImpl().invalidate(prefix);
}
