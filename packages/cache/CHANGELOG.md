# @aioi/cache

## 0.1.0

### Minor Changes

- d951129: Redis read-model cache (B-011): new `@aioi/cache` (cache-aside over ioredis with graceful degradation +
  lazy fail-fast client). The trends read endpoints are cached (`trends.list` 60s, keyword/semantic
  search 30s); bypassed in tests / when `CACHE_DISABLED=1`.
