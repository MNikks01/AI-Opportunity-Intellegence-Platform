# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It records
intent-to-release for the `@aioi/*` workspace packages and generates per-package changelogs.

## Workflow

1. Make your change on a `feat/*`, `fix/*`, or `chore/*` branch.
2. Run `pnpm changeset` — pick the affected packages and a bump (patch/minor/major), write a
   one-line summary. This creates a markdown file here; **commit it with your PR**.
3. Open a PR into `development`. CI runs. A changeset is required for any package-behavior change.
4. When `development` is merged to `main`, the **Release** workflow opens a "Version Packages" PR that
   applies the bumps and updates each package's `CHANGELOG.md`. Merging it cuts the version.

Packages are `private` (not published to npm), so `changeset publish` is a no-op — Changesets is
used here for versioning + changelog, not registry publishing.
