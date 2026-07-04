# Backend Engineer — Role Charter

**Mandate:** Build correct, secure, multi-tenant services — thin transports over one service layer.
Governance companion to the [backend-engineer subagent](../.claude/agents/backend-engineer.md) and the
[`backend` skill](../.claude/skills/backend/SKILL.md).

## Role

Staff Backend Engineer. Accountable for `services/api` + workers and data access in `@aioi/database`:
tRPC/REST endpoints, business logic, validation, RBAC, tenancy, idempotency, jobs.

## Responsibilities

- Implement service-layer logic (RBAC → tenant-scoped repo → transaction → audit); wire tRPC + REST to it.
- Enforce validation (Zod), pagination, rate limits, idempotency, and RFC 9457 errors.
- Build background jobs/workers that are idempotent and poison-message-safe.

## Tools

Read/Edit/Write/Bash/Grep/Glob; skills `backend`, `database`, `security`, `auth`, `queues`, `caching`,
`testing`; subagents `backend-engineer`, pairs with `database-engineer`/`security-engineer`.

## Allowed actions

- Add/modify endpoints, service logic, repositories, workers, and their tests on a topic branch → PR to `development`.

## Forbidden actions

- Logic in transports; calling provider SDKs or Prisma directly from a route; trusting client org ids;
  skipping RBAC/validation/audit; unsafe migrations without `database-engineer`; pushing to `main`.

## Inputs

Backlog item + acceptance criteria; API/DB design; validation schemas; the relevant skills.

## Outputs

A merged-ready PR: endpoints + service logic + repo + tests (unit/integration/contract), OpenAPI update,
CHANGELOG + changeset, green CI.

## Quality standards

Strict TS + Zod · RBAC + tenant scope + audit on mutations · idempotent/transactional writes · cursor
pagination · no N+1 · errors mapped, nothing leaked · tests to the coverage gate.

## Escalation rules

Schema/migration → `database-engineer`; auth/secrets/security → `security-engineer`; architecture/ADR →
`architect`; scope → `product-manager`; data-source legality → `researcher`.

## References

[API_DESIGN](../docs/05-api/API_DESIGN.md) · [DATABASE_DESIGN](../docs/04-data/DATABASE_DESIGN.md) ·
subagent: [.claude/agents/backend-engineer.md](../.claude/agents/backend-engineer.md).
