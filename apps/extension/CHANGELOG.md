# @aioi/extension

## 0.2.0

### Minor Changes

- 62a79b6: Extension content script + packaging (M15-C v2, B-041a/B-041b). On a **GitHub repo** or **Hugging Face
  model** page, a content script recognizes the entity and injects a badge if AIOI tracks it (linked
  trends + momentum).

  - New public **`GET /api/v1/entities/lookup?name=`** (CORS-open) backed by `lookupTrackedEntity`.
  - `apps/extension` gains a content script (`src/content.ts`) with pure URL→name parsing
    (`src/content-api.ts`, unit-tested) for github.com / huggingface.co; esbuild now bundles two entries.
  - `pnpm --filter @aioi/extension package` produces a store-ready `aioi-extension.zip`; added store-listing
    copy (`STORE.md`) + a privacy policy (`PRIVACY.md`). Web Store submission itself needs a publisher
    account (documented, blocked on the operator).

## 0.1.0

### Minor Changes

- d5435b8: Browser extension (M15-C / ADR-0007). A new `apps/extension` — a Manifest V3 popup that puts the AI
  **"build now" opportunities** in your toolbar, over the existing deployed public API.

  - **`apps/extension`** (MV3, built with **esbuild**): a popup that lists `/api/v1/opportunities` and a
    search box over the public API; results deep-link to the web app. Configurable API base URL + optional
    API key (persisted in `localStorage`). No permissions/keys needed — the public API is CORS-open. Pure
    logic (URL building, response mapping) is unit-tested; wired into Turbo (build/typecheck/lint).
  - **`GET /api/v1/search?q=`** — a public keyword-search route (reuses `searchTrends`), same
    envelope/auth/rate-limit as the other v1 routes; listed in the API index.

  Verified: `/api/v1/search` returns data with CORS `*`; the extension builds to a valid MV3 `dist/`.
  Content-script page recognition and Web Store submission are deferred to v2 (B-041).
