# @aioi/ui

## 0.2.0

### Minor Changes

- 05b9e7f: Surface a trend's action plan on its browse card: `TrendView.plan` carries a teaser (top SaaS idea +
  product names) from the included action plan, and `TrendCard` renders a "💡 Build idea" block when present.

## 0.1.1

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0

## 0.1.0

### Minor Changes

- 537a036: Add `Button` (primary/secondary/ghost variants) and a generic, accessible, responsive `DataTable`
  (`Column<T>` render fns, empty state) to `@aioi/ui`. Completes B-012. Also extends the vitest include
  glob to `.test.tsx` so component tests run.

## 0.0.1

### Patch Changes

- 61b169f: Render acronym score dimensions with correct casing (e.g. "SEO" instead of "Seo") in ScoreBar,
  Scorecard, and TrendCard labels.
