---
name: docker
description: >-
  Deep guidance for containerizing the AI Opportunity Intelligence Platform — multi-stage, non-root,
  pnpm/Turborepo-aware images for the Node services, plus the local Docker Compose dev stack. Use when
  writing Dockerfiles, the compose stack, image build steps in CI, or debugging build size/security/
  Prisma-in-container issues.
---

# Docker & Containers

Services (`services/api`, `ai-service`, `ingestion-service`, `scheduler`, `notification-service`) ship
as small, **multi-stage, non-root** images with pinned bases and healthchecks. The local stack
(`infra/docker/docker-compose.yml`) runs Postgres+pgvector, Redis, MinIO, Mailhog, and LiteLLM. Two
monorepo-specific concerns: **prune the workspace** so an image contains only what a service needs, and
**generate the Prisma client** in the build. See [INFRASTRUCTURE](../../../docs/06-infra/INFRASTRUCTURE.md), `devops`, `security`.

## When to apply

- Writing/optimizing a service Dockerfile or the compose stack.
- Adding image build/scan steps to CI, or a devcontainer.
- Debugging image size, startup, non-root, or Prisma-in-container problems.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Non-root + least privilege | A root container escalates any RCE into host risk. |
| **CRITICAL** | No secrets in images | Baked secrets leak via registries/layers. |
| **HIGH** | Multi-stage + prune | Fat images are slow, costly, larger attack surface. |
| **HIGH** | Pinned + scanned base | Reproducibility + known-good, patched bases. |
| **HIGH** | Prisma client in build | Missing generate = runtime crash. |
| **MEDIUM** | Healthcheck + signals | Orchestrators need liveness + graceful shutdown. |
| **MEDIUM** | Layer caching | Fast, cache-friendly builds. |

## Quick reference — the rules

### 1. Non-root (CRITICAL)
- Run as a non-root user (`USER node` or a created user). Read-only root filesystem where possible;
  drop caps. No `sudo`, no package managers left in the final image.

### 2. No secrets (CRITICAL)
- Never `COPY .env` or bake keys. Inject config/secrets at runtime (env/secret manager). Use build
  secrets (`--mount=type=secret`) for private registries, never `ARG` for secrets.

### 3. Multi-stage + prune (HIGH)
- Stages: deps (install) → build (compile) → runtime (only `dist` + prod deps). Use `turbo prune
  --scope=@aioi/<svc>` to isolate a service's subset of the monorepo → tiny context + image.
- Final base slim/distroless; only production `node_modules`.

### 4. Pinned + scanned (HIGH)
- Pin base image by **digest** (`node:22-slim@sha256:…`). Scan images (Trivy/Grype) in CI; generate an
  SBOM. Rebuild on base CVEs.

### 5. Prisma in build (HIGH)
- Run `prisma generate` in the build stage (or rely on the `postinstall`), and copy the generated
  client + schema into the runtime image. Include the query-engine for the target platform.

### 6. Healthcheck + signals (MEDIUM)
- `HEALTHCHECK` hits `/health`. Handle `SIGTERM` for graceful shutdown (drain queues/connections).
  Use `tini`/`--init` for proper signal/zombie handling.

### 7. Layer caching (MEDIUM)
- Copy lockfiles + install before copying source (cache deps). `.dockerignore` node_modules/.next/.git.

## Patterns — good vs bad

**Multi-stage, pruned, non-root service image:**
```dockerfile
# ✅ GOOD (sketch) — deps -> build -> slim non-root runtime
FROM node:22-slim@sha256:... AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo prune --scope=@aioi/api --docker    # isolate the service subset

FROM base AS deps
COPY --from=prune /app/out/json/ ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/ ./
COPY --from=prune /app/out/full/ ./
RUN pnpm --filter @aioi/database exec prisma generate && pnpm --filter @aioi/api build

FROM node:22-slim@sha256:... AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node                                            # non-root
HEALTHCHECK CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1))"
CMD ["node", "dist/main.js"]
```

```dockerfile
# ❌ BAD — root, whole monorepo, secrets baked, unpinned, no prisma generate
FROM node:latest
COPY . .            # copies .env, .git, node_modules; huge; runs as root
RUN npm i && npm run build
CMD npm start
```

## Step-by-step: containerize a service

1. `turbo prune --scope=@aioi/<svc> --docker` for a minimal context.
2. Multi-stage: deps → build (incl. `prisma generate`) → slim non-root runtime with only `dist` + prod deps.
3. Pin base by digest; add `.dockerignore`; add HEALTHCHECK + `--init`; handle SIGTERM.
4. Inject secrets at runtime; scan (Trivy) + SBOM in CI.
5. Verify: image size, runs as non-root, `/health` ok, graceful shutdown. Update compose/infra docs.

## Decision guide

| Need | Do | Don't |
|---|---|---|
| Small image | multi-stage + `turbo prune` + slim base | one stage, full monorepo |
| Secrets | runtime env / build secrets | `COPY .env` / `ARG SECRET` |
| Reproducible base | pin by digest | `node:latest` |
| Prisma at runtime | generate in build; copy engine | expect it to "just work" |
| Local deps | compose stack | install DB/Redis on host |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Huge/slow image | full monorepo, no prune | `turbo prune`; multi-stage; slim base |
| Runs as root | no `USER` | add non-root user; drop caps |
| Prisma crash at runtime | client/engine missing | `prisma generate` in build; copy engine |
| Secret leaked in layer | `COPY .env`/`ARG` | runtime env / build secrets |
| Container won't drain | ignores SIGTERM | handle SIGTERM; `--init`/tini |

## Pre-delivery checklist

- [ ] Multi-stage; `turbo prune` for the service; slim/distroless final base pinned by digest
- [ ] Runs as non-root; minimal caps; read-only FS where possible
- [ ] No secrets in image/layers; config injected at runtime
- [ ] `prisma generate` in build; client + engine present in runtime
- [ ] HEALTHCHECK + graceful SIGTERM handling (`--init`)
- [ ] `.dockerignore` + cache-friendly layer order
- [ ] Image scanned (Trivy/Grype) + SBOM in CI; rebuild on base CVEs
- [ ] Compose/infra docs + CHANGELOG updated

## References
[INFRASTRUCTURE](../../../docs/06-infra/INFRASTRUCTURE.md) · `infra/docker/docker-compose.yml` · skills: `devops`, `kubernetes`, `security`.
