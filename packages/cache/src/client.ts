/**
 * Lazy ioredis singleton. `lazyConnect` + `enableOfflineQueue: false` + one retry make commands fail
 * fast when Redis is down, so the cache-aside helper degrades instead of hanging.
 */
import Redis from "ioredis";

let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    client.on("error", () => {
      /* handled at call sites via try/catch; avoid unhandled 'error' crashes */
    });
  }
  return client;
}
