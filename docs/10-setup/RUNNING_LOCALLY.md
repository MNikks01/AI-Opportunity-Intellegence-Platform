# Running the platform locally (manually)

Step-by-step to boot the whole stack on your machine. It runs **fully green with no external keys**
(stub mode). See [ENV_SETUP.md](./ENV_SETUP.md) to activate real integrations.

---

## 0. Prerequisites

- **Node** `>=20 <25` (Node 24 recommended).
- **pnpm** `9.12.0` — `corepack enable && corepack prepare pnpm@9.12.0 --activate`.
- **Docker** (for Postgres, Redis, MinIO, Mailhog, LiteLLM).

---

## 1. Install dependencies

```bash
pnpm install
```

(`postinstall` runs `prisma generate` for `@aioi/database` automatically.)

---

## 2. Start local infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Brings up:

| Service              | Port        | UI                                                      |
| -------------------- | ----------- | ------------------------------------------------------- |
| Postgres (pgvector)  | 5432        | —                                                       |
| Redis                | 6379        | —                                                       |
| MinIO (S3)           | 9000        | console `http://localhost:9001` (minioadmin/minioadmin) |
| Mailhog (email)      | 1025 (SMTP) | `http://localhost:8025`                                 |
| LiteLLM (AI gateway) | 4000        | —                                                       |

Wait for Postgres to be healthy: `docker compose -f infra/docker/docker-compose.yml ps`.

---

## 3. Configure environment

```bash
cp .env.example .env
```

The defaults already point at the Docker services. **The Node services read `process.env` (no dotenv
auto-load)**, so export `.env` into your shell before running them:

```bash
set -a; source .env; set +a
```

> The Next.js web app auto-loads `.env`; only the API/scheduler need the shell export.

---

## 4. Migrate the database

Applies all 12 migrations (schema + RLS policies + pgvector/HNSW) using the **owner** `DATABASE_URL`:

```bash
pnpm --filter @aioi/database exec prisma migrate deploy
```

(First time / after schema edits, use `prisma migrate dev` instead.)

---

## 5. Grant the restricted runtime role a login (one-time)

The runtime connects as `aioi_app` so **Row-Level Security enforces** (ADR-0003). The migration creates
it `NOLOGIN`; grant it a dev login/password:

```bash
docker exec aioi-postgres-1 psql -U aioi -d aioi \
  -c "ALTER ROLE aioi_app WITH LOGIN PASSWORD 'aioi_app';"
```

This matches `APP_DATABASE_URL` in `.env`. (Skip this only if you accept RLS-off dev — then unset
`APP_DATABASE_URL`.)

---

## 6. Seed demo data (optional but recommended)

Puts a scored trend into Postgres so the dashboards have content:

```bash
pnpm exec tsx scripts/seed-demo.ts
```

---

## 7. Run the apps

**Everything at once** (Turbo runs each package's `dev` in parallel):

```bash
pnpm dev
```

**Or individually** (each in its own shell, with `.env` sourced):

```bash
pnpm --filter @aioi/web dev         # web app    → http://localhost:3000
pnpm --filter @aioi/api dev         # API server → http://localhost:3001
pnpm --filter @aioi/scheduler dev   # BullMQ cron worker (needs Redis)
```

Open **`http://localhost:3000`** → redirects to **/trends**. Nav: Trends · Watchlists · Notifications ·
Briefs · Billing. Without Clerk keys you're the single **dev tenant** (no login required).

---

## 8. Verify it's working

```bash
curl http://localhost:3001/health           # {"status":"ok"}
curl http://localhost:3001/ready            # checks the DB
curl http://localhost:3001/api/v1/trends    # REST: seeded trends
```

- tRPC is served at `http://localhost:3001/trpc`.
- Webhooks (inert without keys): `POST /webhooks/clerk`, `POST /webhooks/stripe` (return `503` until
  configured).

Run the test suite (needs the DB up + `.env` sourced):

```bash
set -a; source .env; set +a
pnpm test        # 162 tests; DB-backed tests use DATABASE_URL/APP_DATABASE_URL, others run hermetically
```

Full quality gate (what CI runs): `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

---

## 9. The scheduler / autonomous pipeline

`@aioi/scheduler` registers repeatable BullMQ jobs (needs Redis):

- **ingestion** — HackerNews → `Signal`, every 30 min.
- **clustering** — unclustered signals → Trends (embed + cosine), hourly.
- **daily briefs** — generate + email per org, 07:00 UTC.

To exercise the pipeline immediately instead of waiting for cron, use the seed script (step 6), or open
a `tsx` REPL and call the job functions (`runIngestionJob`, `runClusteringJob`, `runDailyBriefsJob`)
exported from `@aioi/scheduler`.

---

## Troubleshooting

| Symptom                                                    | Fix                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `password authentication failed for user "aioi_app"`       | Run step 5 (grant login), or unset `APP_DATABASE_URL`.                                  |
| `invalid input syntax for type uuid: ""` on a tenant query | You're on an old migration — run step 4 (the `harden_rls_null_org` migration fixes it). |
| API/scheduler can't see env vars                           | You didn't `source .env` in that shell (step 3).                                        |
| Migrations fail to connect                                 | Postgres not healthy yet — wait, then retry step 4.                                     |
| Semantic search / scores look random                       | No AI keys — you're in stub mode. Add a provider key (ENV_SETUP §2) + restart LiteLLM.  |
| Ports already in use                                       | Stop conflicting services or change ports in compose / `PORT` env.                      |

---

## Stopping

```bash
docker compose -f infra/docker/docker-compose.yml down       # keep data
docker compose -f infra/docker/docker-compose.yml down -v    # wipe volumes (fresh DB)
```
