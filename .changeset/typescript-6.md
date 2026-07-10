---
---

TypeScript 5→6 migration (B-026). Bumped `typescript` to ^6.0.3 across the workspace. TS 6 requires an
explicit `rootDir` when emitting declarations (error TS5011), so each emitting package/service tsconfig
now sets `rootDir`/`outDir` locally — the shared `@aioi/tsconfig` preset can't express it because
`extends`-relative paths anchor to the preset's own directory, not the inheriting package. Also disabled
core `no-undef` in the shared ESLint config: typescript-eslint 8.x no longer turns it off under TS 6, and
`tsc` already resolves undefined identifiers (incl. Node globals) far more accurately. No runtime/source
behaviour change — a build-toolchain migration. Typecheck (31), lint (31), build (19), and 194 tests all
green. Dependabot now holds the next major (TS 7 — native compiler) for a deliberate migration.
