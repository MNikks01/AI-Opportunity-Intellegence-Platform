---
name: frontend
description: >-
  Deep guidance for building the web UI of the AI Opportunity Intelligence Platform — Next.js App
  Router + React 19 (RSC-first), @aioi/ui design system, React Query + Zustand, React Hook Form + Zod,
  TanStack Table, Recharts, Framer Motion. Use when building or reviewing pages/components in apps/web
  (and admin/marketing/docs): data fetching, state, forms, tables, charts, states, and performance.
---

# Frontend Engineering

RSC-first Next.js App Router. Server Components fetch data (from `@aioi/database` server-side or the
API); Client Components handle interactivity. UI is built from `@aioi/ui` (tokens + components) — never
raw colors/spacing. Server state is React Query; ephemeral UI state is Zustand; forms are RHF + Zod
(shared schemas). Accessibility (WCAG 2.2 AA) and the mandatory loading/empty/error states are
functional requirements. See [Design System](../../../docs/03-design/DESIGN_SYSTEM.md), [IA](../../../docs/03-design/INFORMATION_ARCHITECTURE.md),
and the `ui-ux`, `accessibility`, `performance`, `seo` skills.

## When to apply

- Building/reviewing any page or component in `apps/web` (or admin/marketing/docs).
- Data fetching (RSC vs client), forms, tables, charts, or client state.
- Implementing empty/loading/error states, responsive layout, or motion.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Server/client boundary | Wrong boundary leaks secrets/DB to the client or kills perf. |
| **CRITICAL** | Accessibility | WCAG 2.2 AA is required; a11y bugs are functional bugs. |
| **CRITICAL** | Required states | Missing empty/loading/error = broken UX on real data. |
| **HIGH** | Design tokens only | Raw values break theming + consistency. |
| **HIGH** | Data-fetching discipline | RSC vs React Query; no waterfalls; cache correctly. |
| **HIGH** | Validated forms | RHF + Zod; the same schema as the server. |
| **MEDIUM** | Performance | Bundle size, streaming, memoization where it matters. |
| **MEDIUM** | Motion | Meaningful, reduced-motion-aware. |

## Quick reference — the rules

### 1. Server/client boundary (CRITICAL)
- Default to Server Components. Add `"use client"` only for interactivity (state, effects, event
  handlers). Never import `@aioi/database`/secrets into a Client Component. Keep client bundles lean —
  push data + heavy logic to the server.

### 2. Accessibility (CRITICAL)
- Semantic HTML + roles; visible focus; full keyboard nav; logical tab order; skip-to-content.
- Charts have a data-table fallback; icons have labels. Never color-only meaning (pair with text/value).
  Respect `prefers-reduced-motion`. Verify with the `web-design-guidelines`/`accessibility` skills.

### 3. Required states (CRITICAL)
- Every data surface implements **loading (skeleton) · empty (instructive) · error (retry) · partial/
  stale (badge)**. No blank screens, no infinite spinners without a fallback.

### 4. Design tokens (HIGH)
- Consume `@aioi/ui` tokens/components; never hardcode colors/spacing/radii. Support light + dark.
  Chart colors come from the `dataviz` conventions, not literals.

### 5. Data fetching (HIGH)
- RSC for initial/SEO data (server fetch, `force-dynamic` when using live tenant data). Client
  interactivity uses React Query (stale-while-revalidate, sensible keys). Avoid request waterfalls;
  parallelize. tRPC client for typed calls.

### 6. Forms (HIGH)
- React Hook Form + the shared Zod schema (`@aioi/validation`) — one schema, client + server. Show
  field errors tied via `aria-describedby`. Optimistic UI reconciled with server truth.

### 7. Performance (MEDIUM)
- Stream with Suspense; code-split heavy client components; `memo`/`useMemo` only where measured.
  `max-width:100%` media; virtualize long lists/tables (TanStack).

### 8. Motion (MEDIUM)
- Framer Motion for meaningful transitions (state/spatial continuity), not decoration. Score bars
  animate once on load. Honor reduced-motion.

## Patterns — good vs bad

**RSC data + client interactivity split:**
```tsx
// ✅ GOOD — server component fetches; client child handles interaction
// app/trends/page.tsx (server)
export const dynamic = "force-dynamic";
export default async function TrendsPage() {
  const trends = await listTrends(50);            // @aioi/database, server-only
  return <TrendGrid trends={trends} />;           // presentational
}
// TrendFilters.tsx (client) — only the interactive bit is client
"use client";
export function TrendFilters() { const [f, setF] = useState(...); /* ... */ }
```

```tsx
// ❌ BAD — client component importing the DB (leaks server code/secrets) + no states
"use client";
import { listTrends } from "@aioi/database";       // ❌ never in the client
export default function Page() { const t = use(listTrends()); return <div>{t.map(...)}</div>; }
```

**Required states + tokens:**
```tsx
// ✅ GOOD — loading/empty/error, token-driven, accessible
if (isLoading) return <Skeleton rows={6} />;
if (error) return <ErrorState onRetry={refetch} />;
if (!data.length) return <EmptyState title="No trends match these filters" action="Clear filters" />;
return <DataTable data={data} />;   // colors/spacing from @aioi/ui tokens
```

**Form with shared schema:**
```tsx
// ✅ GOOD — one Zod schema, client + server
const form = useForm({ resolver: zodResolver(createWatchlistSchema) });
```

## Step-by-step: build a screen

1. Read the wireframe + IA; identify server vs client parts.
2. Server Component fetches data (server-side; `force-dynamic` for tenant data). Compose from `@aioi/ui`.
3. Implement all four states (loading/empty/error/stale).
4. Add interactivity as small Client Components (React Query / Zustand); forms via RHF + Zod.
5. A11y pass (keyboard, roles, labels, contrast); reduced-motion.
6. Performance pass (Suspense streaming, split, virtualize).
7. RTL + a11y tests; add an E2E for a critical journey. Docs/CHANGELOG/changeset.

## Decision guide

| Need | Use | Don't |
|---|---|---|
| Initial/SEO data | RSC server fetch | client `useEffect` fetch |
| Interactive server data | React Query (client) | prop-drilling refetch |
| Ephemeral UI state | Zustand / local state | React Query for UI toggles |
| Forms | RHF + Zod (shared) | uncontrolled + manual validation |
| Long list/table | TanStack virtualization | render 10k rows |
| Any color/spacing | `@aioi/ui` token | hardcoded hex/px |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Secrets/DB in client bundle | `@aioi/database` in a client component | fetch on server; pass props |
| Blank screen / infinite spinner | missing empty/error state | implement all four states |
| Inconsistent look / broken dark mode | hardcoded values | use tokens; test both themes |
| Slow page / big bundle | client-heavy, no streaming | RSC + Suspense + code-split |
| Fails a11y audit | color-only, no labels/focus | semantic HTML, ARIA, focus, contrast |

## Pre-delivery checklist

- [ ] RSC-first; `"use client"` only where needed; no DB/secrets in client
- [ ] WCAG 2.2 AA (keyboard, focus, roles/labels, contrast, reduced-motion); chart data-table fallback
- [ ] loading/empty/error/stale states on every data surface
- [ ] `@aioi/ui` tokens/components only; light + dark; chart colors via dataviz
- [ ] React Query for server state, Zustand for UI; no waterfalls; sensible cache keys
- [ ] Forms: RHF + shared Zod schema; accessible errors
- [ ] Streaming/split/virtualization where it matters; bundle checked
- [ ] RTL + a11y tests; E2E for critical journeys; CHANGELOG + changeset

## References
[DESIGN_SYSTEM](../../../docs/03-design/DESIGN_SYSTEM.md) · [WIREFRAMES](../../../docs/03-design/WIREFRAMES.md) ·
skills: `ui-ux`, `accessibility`, `performance`, `seo`, `testing`; installed `vercel-react-best-practices`, `web-design-guidelines`, `frontend-design`, `dataviz`.
