# @aioi/web

## 0.1.0

### Minor Changes

- 982b2aa: Add the alerts & notifications UI: an Alerts section on the watchlist detail (create/enable/disable/
  delete) and a `/notifications` inbox (mark read / mark all read) with a nav link, via Server Actions
  over the RLS-enforced repositories (B-017).
- 4404aa1: Add the Watchlists UI: `/watchlists` (list + create + delete) and `/watchlists/[id]` (items +
  add/remove) as RSC pages with Server Actions over the RLS-enforced repository, plus a nav link. A
  request-cached dev-org resolver stands in for a session until Clerk is wired (B-016).

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/database@0.3.0
  - @aioi/validation@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies [c2a8c88]
- Updated dependencies [8a43b68]
  - @aioi/database@0.2.0

## 0.0.2

### Patch Changes

- Updated dependencies [1bc6a1b]
  - @aioi/database@0.1.0

## 0.0.1

### Patch Changes

- Updated dependencies [61b169f]
  - @aioi/ui@0.0.1
