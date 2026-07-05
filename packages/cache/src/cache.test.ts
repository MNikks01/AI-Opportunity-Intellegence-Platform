import { describe, expect, it, vi } from "vitest";
import { createCache, type CacheClient } from "./index";

function fakeRedis(): CacheClient {
  const store = new Map<string, string>();
  return {
    get: (k) => Promise.resolve(store.get(k) ?? null),
    set: (k, v) => {
      store.set(k, v);
      return Promise.resolve("OK");
    },
    keys: (pattern) => {
      const prefix = pattern.replace(/\*$/, "");
      return Promise.resolve([...store.keys()].filter((k) => k.startsWith(prefix)));
    },
    del: (...ks) => {
      let n = 0;
      for (const k of ks) if (store.delete(k)) n++;
      return Promise.resolve(n);
    },
  };
}

const throwingRedis: CacheClient = {
  get: () => Promise.reject(new Error("down")),
  set: () => Promise.reject(new Error("down")),
  keys: () => Promise.reject(new Error("down")),
  del: () => Promise.reject(new Error("down")),
};

describe("createCache", () => {
  it("loads on miss, serves from cache on hit (loader runs once)", async () => {
    const cache = createCache(fakeRedis());
    const loader = vi.fn().mockResolvedValue({ n: 1 });
    const a = await cache.cached("k", 60, loader);
    const b = await cache.cached("k", 60, loader);
    expect(a).toEqual({ n: 1 });
    expect(b).toEqual({ n: 1 }); // round-trips through JSON
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("invalidate(prefix) forces a reload", async () => {
    const cache = createCache(fakeRedis());
    const loader = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    expect(await cache.cached("trends:list", 60, loader)).toBe("v1");
    await cache.invalidate("trends:");
    expect(await cache.cached("trends:list", 60, loader)).toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("degrades gracefully when Redis is down (loader still runs)", async () => {
    const cache = createCache(throwingRedis);
    const loader = vi.fn().mockResolvedValue("live");
    expect(await cache.cached("k", 60, loader)).toBe("live");
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
