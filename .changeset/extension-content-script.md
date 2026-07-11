---
"@aioi/extension": minor
"@aioi/database": minor
"@aioi/web": minor
---

Extension content script + packaging (M15-C v2, B-041a/B-041b). On a **GitHub repo** or **Hugging Face
model** page, a content script recognizes the entity and injects a badge if AIOI tracks it (linked
trends + momentum).

- New public **`GET /api/v1/entities/lookup?name=`** (CORS-open) backed by `lookupTrackedEntity`.
- `apps/extension` gains a content script (`src/content.ts`) with pure URL→name parsing
  (`src/content-api.ts`, unit-tested) for github.com / huggingface.co; esbuild now bundles two entries.
- `pnpm --filter @aioi/extension package` produces a store-ready `aioi-extension.zip`; added store-listing
  copy (`STORE.md`) + a privacy policy (`PRIVACY.md`). Web Store submission itself needs a publisher
  account (documented, blocked on the operator).
