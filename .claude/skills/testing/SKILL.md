---
name: testing
description: >-
  Deep testing guidance for the AI Opportunity Intelligence Platform — Vitest (unit/integration), React
  Testing Library, Playwright (E2E), MSW (network mocks), plus AI eval and DB-integration testing. Use
  when writing/reviewing tests, setting up fixtures, testing connectors/scoring/API/UI, wiring coverage
  gates, or diagnosing flaky tests. Root config: vitest.config.ts; run `pnpm test`.
---

# Testing

Test **behavior, not implementation**. The suite runs once at the repo root (`pnpm test` → `vitest run`);
DB-integration tests are guarded by `DATABASE_URL` so unit runs stay hermetic. The proven patterns in
this repo: MSW for connectors, a deterministic `StubProvider` for scoring, and `describe.skipIf(!hasDb)`
for router-vs-Postgres integration. See [CODE_GUIDELINES §6](../../../docs/08-quality/CODE_GUIDELINES.md).

## When to apply

- Adding any code path, connector, scorer, endpoint, or UI component.
- Setting up fixtures/mocks, coverage gates, or E2E/a11y/visual tests.
- Diagnosing flaky or slow tests.

## The test pyramid (this project)

| Layer | Tool | Scope | Speed | Where |
|---|---|---|---|---|
| Unit | Vitest | pure functions, services (fake repo), scoring (stub) | ms | every package |
| Component | Vitest + RTL | React components, states, a11y | ms | `@aioi/ui`, `apps/web` |
| Integration | Vitest + MSW / live DB | connectors (mocked net), routers (live Postgres) | 10s–1s | services |
| E2E | Playwright | critical user journeys in a browser | s | `apps/web` |
| Eval | `llm-eval-harness` | AI quality regression gate | s | `ai-service` (CI) |

Most tests are unit/integration; E2E covers only critical journeys (activation, trend→score, watchlist→alert).

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Determinism | Flaky tests erode trust and block merges. |
| **CRITICAL** | No real network in unit tests | Slow, flaky, and hits third parties. |
| **CRITICAL** | Behavior over implementation | Impl tests break on every refactor. |
| **HIGH** | Edge-case coverage | Connectors: happy/429/malformed/empty; scoring: grounding/cache. |
| **HIGH** | Isolation & cleanup | Shared state between tests → order-dependent failures. |
| **MEDIUM** | Coverage gate | Prevent silent erosion; focus on changed code. |
| **MEDIUM** | A11y & visual (UI) | Accessibility is a functional requirement. |

## Quick reference — the rules

### 1. Determinism (CRITICAL)
- No wall-clock/`Math.random`/network in unit tests. Inject clocks, seeds, `sleep`, and `fetch`.
- Pin temperature 0 for eval runs; average fuzzy metrics over N seeds.

### 2. Mock the network (CRITICAL)
- Connectors: **MSW** (`setupServer`, `onUnhandledRequest: "error"`) — assert on real fetch behavior.
- LLM: the deterministic **`StubProvider`** from `@aioi/ai-sdk` (runs offline; stable output).

### 3. Behavior, not implementation (CRITICAL)
- Assert observable outputs/contracts, not private internals. Prefer RTL role/text queries over test ids.

### 4. Edge cases (HIGH)
- **Every connector**: happy path, `429`+retry, malformed payload (skipped), empty, idempotent re-run.
- **Scoring**: 10 dims + valid schema, composite computed, determinism, cache keyed by rubric version,
  reject no-signals (grounding).
- **API**: list, by-id/slug, NOT_FOUND, RBAC denial, cross-tenant denial.

### 5. Isolation (HIGH)
- `beforeEach`/`afterEach` reset state (`server.resetHandlers()`, DB rows). No test depends on another's order.

### 6. DB integration (HIGH)
- Guard with `describe.skipIf(!process.env.DATABASE_URL)`. CI provides Postgres + runs `prisma migrate
  deploy` first. Use a unique slug per test to avoid collisions.

### 7. Coverage & a11y (MEDIUM)
- Coverage must not regress on changed packages. UI components get an a11y assertion (roles/labels,
  keyboard). Consider Playwright + axe for a11y E2E and visual regression on key screens.

## Patterns — good vs bad

**Injectable deps for determinism (connector):**
```ts
// ✅ GOOD — MSW mocks the net; sleep injected so 429-retry doesn't actually wait
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
it("retries on 429 then succeeds", async () => {
  let calls = 0;
  server.use(http.get(`${HN}/item/1.json`, () => {
    calls++; return calls === 1
      ? new HttpResponse(null, { status: 429, headers: { "retry-after": "0" } })
      : HttpResponse.json(story(1));
  }));
  const { records } = await fetchTopStories(1, { sleep: () => Promise.resolve() });
  expect(calls).toBe(2); expect(records).toHaveLength(1);
});
```

**Service unit with a fake repo (no DB):**
```ts
// ✅ GOOD — behavior of the service, not Prisma
const repo = new InMemorySignalRepository();
expect(await repo.upsertMany(records)).toBe(2);
expect(await repo.upsertMany(records)).toBe(0);   // idempotent
```

**DB-guarded integration:**
```ts
// ✅ GOOD — only runs when a DB is present; hermetic default runs skip it
describe.skipIf(!process.env.DATABASE_URL)("api router (integration)", () => {
  beforeAll(() => persistScoredTrend(trend, scores));
  it("returns the seeded trend", async () => {
    const list = await appRouter.createCaller(createContext()).trends.list({ limit: 100 });
    expect(list.some((t) => t.slug === slug)).toBe(true);
  });
});
```

**Bad — implementation coupling / real network:**
```ts
// ❌ BAD — hits real HN (flaky, slow), asserts a private field
const data = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
expect((connector as any)._cursor).toBe(42);
```

## Step-by-step: test a new feature

1. Start from acceptance criteria → list happy path + edge cases.
2. For network: MSW handlers + fixtures under `__fixtures__/`. For AI: `StubProvider`.
3. Unit the pure logic/service (fake repo). Component-test UI (RTL + a11y).
4. Add integration (router vs live DB, guarded) and, for critical journeys, a Playwright E2E.
5. For AI changes: add a golden case to `llm-eval-harness`.
6. Run `pnpm test` (set `DATABASE_URL` to include integration). Keep coverage from regressing.

## Decision guide

| To test… | Use | Not |
|---|---|---|
| pure logic / service | Vitest unit + fake repo | a real DB |
| a data-source connector | MSW + injected sleep | live third-party calls |
| an LLM feature | `StubProvider` + eval golden case | real paid API in CI |
| repo query / RLS | DB-guarded integration | mocking Prisma internals |
| a user journey | Playwright E2E | a giant unit test |
| a UI component | RTL (roles/text) + a11y | snapshot-only |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Flaky/intermittent | time/random/network/order dependence | inject clock/seed/fetch; reset state |
| "hangs" then fails | real network in unit test | MSW; `onUnhandledRequest: "error"` |
| Passes locally, fails CI | DB not migrated / env missing | `migrate deploy` in CI; guard with `DATABASE_URL` |
| Breaks on every refactor | implementation coupling | assert behavior/contracts |
| Slow suite | too many E2E / no mocking | push down the pyramid; mock net |

## Pre-delivery checklist

- [ ] Deterministic (injected clock/seed/sleep/fetch); no real network in unit tests
- [ ] Connector: happy/429/malformed/empty/idempotent covered (MSW)
- [ ] Scoring: schema-valid, composite, determinism, cache, grounding covered (StubProvider)
- [ ] API: list/by-id, NOT_FOUND, RBAC + cross-tenant denial
- [ ] DB integration guarded by `DATABASE_URL`; unique fixtures; cleanup
- [ ] UI: RTL behavior + a11y assertions; critical journeys have E2E
- [ ] AI change → golden case added; eval green
- [ ] Coverage not regressed; `pnpm test` green

## References
[CODE_GUIDELINES §6](../../../docs/08-quality/CODE_GUIDELINES.md) · root `vitest.config.ts` ·
skills: `backend`, `database`, `ai`, `llm-eval-harness`, `data-source-integration`, `frontend`; built-in `verify`, `webapp-testing`.
