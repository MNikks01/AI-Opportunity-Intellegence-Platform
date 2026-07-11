# ADR-0005 — Supply-side tracking (models, MCP servers, repos)

- **Status:** Proposed
- **Date:** 2026-07-11
- **Deciders:** Architect, Backend Engineer, Product (pending)
- **Context source:** M15 "model/prompt/MCP tracking" ([MILESTONES](../09-process/MILESTONES.md)), the
  `product-strategy-usp` supply×demand framing, [ADR-0001](ADR-0001-core-stack.md),
  [ADR-0003](ADR-0003-row-level-security.md)

## Context

The USP is **supply × demand**: cross what people _want_ (demand) with what's _being built_ (supply) to
surface high-demand / low-supply opportunities. Today we track **demand well** — trends carry
`TrendSnapshot` momentum (signal-count velocity) and the Golden Quadrant maps demand × supply at the
_trend_ level. But the **supply side is under-tracked**: `Entity` rows (`MODEL`, `MCP_SERVER`, `REPO`,
`PAPER`, `TOOL`, `COMPANY`, `PERSON`) exist only as **static byproducts** of trend extraction
(`extractEntities` → `linkTrendEntity`). There is no time-series, no momentum, no dedicated surface, and
no way to watch or alert on a _specific model / MCP server / repo_ as a first-class object.

M15 asks us to track the supply side directly — new and rising **models, MCP servers, and notable
repos** — as leading indicators of where builders are moving. We must decide: what "tracking" means as a
data model, which entity types are in scope for v1, which data sources feed it (legality matters —
[data-source rule](../../CLAUDE.md)), and what surfaces expose it, all while keeping CI green with no keys.

A note on **"prompts":** there is no official, licensable registry of "trending prompts." Prompt activity
surfaces indirectly through **GitHub repos** (prompt libraries/frameworks) and entity extraction, so v1
folds prompts into `REPO`/entity tracking rather than standing up a separate, ToS-risky prompt pipeline.

## Decision

### D1 — Elevate entities to first-class **tracked objects** with a time-series

Add an `EntitySnapshot` model mirroring `TrendSnapshot` — an append-only, once-per-pipeline-run history
point per tracked entity capturing its **linked-trend count**, **aggregate signal weight**, and a derived
**momentum** (velocity vs a ~7-day baseline), plus `capturedAt`. Momentum is computed with the **same
method already proven for trends** (`getTrendMomentumMap`), so the supply side gets the same
accelerating/steady/fading read the demand side has. Entities remain **global** (not org-scoped);
tracking is a property of the entity, not a tenant.

### D2 — v1 scope: `MODEL`, `MCP_SERVER`, `REPO` — fed by **existing OFFICIAL sources**

No new data source and **no legality gate**. Supply-side entities are populated/refreshed from sources we
already ingest under an OFFICIAL classification:

- **Hugging Face** (`huggingface` connector) → `MODEL` entities (most-liked/newest public models).
- **GitHub** (`github` connector) → `REPO` and `MCP_SERVER` entities (MCP servers are repos; detect by
  topic/`mcp` naming + entity extraction).
- **arXiv** (`arxiv` connector) → `PAPER` entities (kept as supporting context; not a v1 tracked type).
- **`extractEntities`** (already wired) continues to discover and link entities from trend signals.

`COMPANY` / `PERSON` are explicitly **out of v1** — those lean toward the competitor/funding feature,
which has its own licensed-data-source decision (a future ADR), not this one.

### D3 — A dedicated **supply-tracking surface**, reusing existing viz

Extend the existing `/entities` area rather than build a parallel app:

- A **leaderboard** of rising/new supply-side entities (filter by type; sort by momentum or recency),
  reusing the momentum sparkline component from the trend momentum feature.
- **Entity detail** gains a momentum sparkline + the trajectory of its linked trends (the supply signal's
  "trajectory over time"), alongside the existing linked-trends list.
- The Golden Quadrant remains trend-level; this feature deepens the **supply axis** with real momentum.

### D4 — Watch + alert integration is **phase 2**, behind the existing primitives

Reuse `WatchTargetType`/watchlists and the alerts engine so a user can **watch a specific model/MCP
server/repo** and be alerted when its momentum crosses a threshold — but only after D1–D3 land and prove
the signal. No new alert mechanism; extend the existing target-type + rule model.

### D5 — Offline-first, same as the rest of the stack

Snapshotting and momentum are pure/deterministic over DB rows (no model calls). Entity discovery already
runs through the deterministic dictionary offline and `extractEntities` (LLM) only when keys are set. The
whole feature stays green in CI with **zero keys**, matching the adapter+Stub convention.

## Acceptance criteria (v1 = D1–D3)

1. **Schema:** `EntitySnapshot(entityId, linkedTrendCount, signalWeight, momentum?, capturedAt)` +
   migration; indexed `(entityId, capturedAt)`. RLS N/A (global), consistent with `Entity`.
2. **Snapshotting:** a scheduler job writes one snapshot per tracked entity per run; idempotent; unit +
   DB-integration tested (guarded by `DATABASE_URL`).
3. **Momentum:** `getEntityMomentumMap` computes accelerating/steady/fading vs a ~7-day baseline, reusing
   the trend-momentum method; unit-tested against a seeded series.
4. **Repositories:** `listTrackedEntities({ type?, sort })` returns supply-side entities with current
   momentum + linked-trend count; cross-checked they never leak org-scoped data.
5. **Sources → entities:** HF `MODEL` and GitHub `REPO`/`MCP_SERVER` entities are upserted from existing
   connectors (no new source); MCP detection covered by tests (happy + non-MCP repo ignored).
6. **Web:** `/entities` shows a type-filterable, momentum-sortable leaderboard; entity detail renders a
   momentum sparkline. RTL/a11y assertions on the new components; loading/empty/error states present.
7. **Gate:** `pnpm format:check && lint && typecheck && test && build` green with **no keys**; new tests
   included; coverage on changed packages not regressed.

## Alternatives considered

- **A new licensed source (Crunchbase, etc.) now.** Rejected for v1 — that's the competitor/funding
  feature's decision (cost + coverage + legality); supply-side tracking needs none of it.
- **A separate `Model`/`McpServer` table instead of extending `Entity`.** Rejected — `Entity` +
  `EntityType` already models exactly this and is linked to trends; a parallel table would fork the
  extraction/linking logic and the `/entities` surface.
- **Scraping model/prompt leaderboards** (e.g., unofficial trending lists). Rejected outright per the
  data-source rule — official APIs only.
- **A standalone prompt-tracking pipeline.** Deferred — no official trending-prompt source; folded into
  `REPO`/entity tracking.

## Consequences

- **Positive:** the supply side gets the same momentum rigor as demand, deepening the signature
  supply×demand USP; built entirely on existing OFFICIAL sources and the `Entity` model; no new legality
  or cost decision; offline-testable.
- **Negative / cost:** one new table + snapshot job (more scheduler work per run); `MCP_SERVER` detection
  from GitHub is heuristic and will need tuning; "prompt tracking" is only partially addressed in v1.
- **Follow-ups:** D4 (watch/alert on entities); a future ADR for competitor/funding (licensed source);
  revisit `PAPER`/`COMPANY` as tracked types once v1 proves the surface.

## Proposed backlog decomposition (M15-A)

- **B-028** — `EntitySnapshot` model + migration + snapshot job (D1/D2).
- **B-029** — `getEntityMomentumMap` + `listTrackedEntities` repositories (D1/D3).
- **B-030** — HF/GitHub → `MODEL`/`REPO`/`MCP_SERVER` entity upserts + MCP detection (D2).
- **B-031** — `/entities` leaderboard + entity-detail momentum sparkline (D3).
- **B-032** — (phase 2) watch + alert on a tracked entity (D4).
