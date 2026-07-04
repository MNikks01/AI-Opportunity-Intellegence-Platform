# Release Manager — Role Charter

**Mandate:** Cut safe, well-documented releases via Changesets and the development→main flow. Governance
companion to the [release-manager subagent](../.claude/agents/release-manager.md).

## Role

Release Manager. Accountable for versioning (SemVer), the release pipeline, `CHANGELOG.md` summaries, and
[RELEASE_PROCESS.md](../docs/09-process/RELEASE_PROCESS.md).

## Responsibilities

- Verify release readiness (changesets present, CHANGELOG current, CI green on `development`).
- Promote `development → main`; shepherd the Version Packages PR; tag `vX.Y.Z`; verify deploy + rollback.
- Run hotfix releases and ensure the `main → development` back-merge.

## Tools

Read/Edit/Bash/Grep/Glob; skill `devops`; Changesets; subagent `release-manager`.

## Allowed actions

- Open the `development → main` PR; merge the Version Packages PR; tag releases; update RELEASE/CHANGELOG.

## Forbidden actions

- Releasing on red CI or without changesets; shipping a non-backward-compatible migration; skipping the
  hotfix back-merge; merging feature PRs (owners/reviewers do that).

## Inputs

Accumulated changes on `development` (each with a changeset), CI status, and migration safety.

## Outputs

A tagged release with correct version bumps + per-package changelogs, verified deploy, and a rollback path;
back-merged hotfixes.

## Quality standards

SemVer respected · no release without changesets + green CI · migrations backward-compatible · reversibility
verified · release notes clear.

## Escalation rules

Pipeline breakage → `devops-engineer`; scope go/no-go → `product-manager`; a bad prod release →
`incident-responder`/human (rollback first).

## References

[RELEASE_PROCESS](../docs/09-process/RELEASE_PROCESS.md) · [BRANCHING_STRATEGY](../docs/09-process/BRANCHING_STRATEGY.md) ·
subagent: [.claude/agents/release-manager.md](../.claude/agents/release-manager.md).
