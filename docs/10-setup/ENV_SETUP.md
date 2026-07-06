# Environment setup — filling in `.env`

How to complete every value in [`.env.example`](../../.env.example). Copy it first:

```bash
cp .env.example .env
```

**You do not need any external keys to run the platform.** Every integration (Clerk, Stripe, Resend,
LiteLLM) is behind an adapter with a deterministic **Stub** fallback: leave the key blank and that
feature runs in dev/stub mode. Add a key only to activate the real thing. The table below marks each
group **Required** (to run), **Provided by Docker** (no signup), or **Optional** (external key).

---

## 1. Core & local infra — Provided by Docker (no signup)

These match the local stack in `infra/docker/docker-compose.yml`. Use the defaults as-is.

| Variable                                    | Default                                                            | Notes                                                                                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                  | `development`                                                      | —                                                                                                                                                                                                                       |
| `DATABASE_URL`                              | `postgresql://aioi:aioi@localhost:5432/aioi?schema=public`         | **Owner** URL — runs Prisma migrations.                                                                                                                                                                                 |
| `APP_DATABASE_URL`                          | `postgresql://aioi_app:aioi_app@localhost:5432/aioi?schema=public` | **Restricted runtime** role so RLS enforces (ADR-0003). Created NOLOGIN by a migration — grant it login once after migrating (see [RUNNING_LOCALLY](./RUNNING_LOCALLY.md)). Leave unset only if you accept RLS-off dev. |
| `REDIS_URL`                                 | `redis://localhost:6379`                                           | Cache + BullMQ queues.                                                                                                                                                                                                  |
| `S3_ENDPOINT`                               | `http://localhost:9000`                                            | MinIO (S3-compatible). Console at `http://localhost:9001`.                                                                                                                                                              |
| `S3_REGION` / `S3_BUCKET`                   | `auto` / `aioi-assets`                                             | Create the bucket in the MinIO console.                                                                                                                                                                                 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | `minioadmin` / `minioadmin`                                        | MinIO root creds from compose. In prod, use Cloudflare R2 tokens.                                                                                                                                                       |
| `OTEL_EXPORTER_OTLP_ENDPOINT`               | `http://localhost:4318`                                            | OpenTelemetry collector (optional locally).                                                                                                                                                                             |

> **Prod swap:** `DATABASE_URL`/`APP_DATABASE_URL` → managed Postgres (Fly/RDS) with a real `aioi_app`
> password from secrets; `REDIS_URL` → managed Redis; `S3_*` → Cloudflare R2.

---

## 2. AI gateway & model providers — Optional (needed for real AI output)

Without these, the app uses the deterministic **StubProvider/StubEmbedder** (scoring, action plans,
clustering, semantic search all run, but with placeholder values). Add them for real model output.

| Variable             | Default                 | Where to get it                                                                                                                           |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `LITELLM_BASE_URL`   | `http://localhost:4000` | The LiteLLM gateway (started by Docker compose). All model calls route through it. Keep the default locally.                              |
| `OPENAI_API_KEY`     | —                       | platform.openai.com → **API keys** → _Create new secret key_ (`sk-…`). Used for `text-embedding-3-small` (semantic search) + chat models. |
| `ANTHROPIC_API_KEY`  | —                       | console.anthropic.com → **API Keys** → _Create Key_ (`sk-ant-…`).                                                                         |
| `GEMINI_API_KEY`     | —                       | aistudio.google.com → **Get API key**.                                                                                                    |
| `OPENROUTER_API_KEY` | —                       | openrouter.ai → **Keys** → _Create key_ (one key, many models).                                                                           |

**Steps (real AI locally):**

1. Get **at least one** provider key (OpenAI is simplest — it covers both embeddings and chat).
2. Put it in `.env`. Docker compose passes `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`/`GEMINI_API_KEY` into
   the LiteLLM container.
3. Restart the LiteLLM container so it picks up the key. The proxy is config-driven
   (`infra/docker/litellm.config.yaml`) and already routes `text-embedding-3-small` +
   `claude-opus-4-8`. Scoring/embeddings now hit the real model via `LITELLM_BASE_URL` —
   **clustering + semantic search become genuinely semantic**.
4. Set `AIOI_SCORING_MODEL` / `AIOI_EMBED_MODEL` (optional overrides). Embeddings always request
   `dimensions: 1536` to match the pgvector column, so use a 1536-capable embed model.

---

## 3. Auth — Clerk — Optional (needed for real sign-in)

Without these, the web app runs as a single **dev tenant** (no login) and the API uses the dev
StubAuthProvider. Add them for real per-user auth + sign-up provisioning.

| Variable                            | Where to get it                                                                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | dashboard.clerk.com → create an application → **API keys** → _Publishable key_ (`pk_test_…`). Enables the web app's sign-in.                                                                                                 |
| `CLERK_PUBLISHABLE_KEY`             | Same publishable key (server-side copy).                                                                                                                                                                                     |
| `CLERK_SECRET_KEY`                  | Same **API keys** page → _Secret key_ (`sk_test_…`). The API verifies session JWTs with this.                                                                                                                                |
| `CLERK_WEBHOOK_SECRET`              | Clerk dashboard → **Webhooks** → _Add Endpoint_ → URL `https://<your-api-host>/webhooks/clerk`, subscribe to `user.created` + `user.updated` → copy the **Signing Secret** (`whsec_…`). This provisions a tenant on sign-up. |

**Steps:**

1. Create a Clerk application (dashboard.clerk.com).
2. Copy the **Publishable** + **Secret** keys into `.env` (publishable goes into both the `NEXT_PUBLIC_`
   and plain vars).
3. **Enable Organizations** in Clerk (Configure → Organizations) — the app is org-scoped.
4. Add the **webhook** endpoint pointing at your API's `/webhooks/clerk`; copy the signing secret.
   (For local webhook testing, expose the API with a tunnel, e.g. `ngrok http 3001`.)

---

## 4. Billing — Stripe — Optional (needed for real checkout)

Without these, `billing.checkout` returns a Stub URL and `/webhooks/stripe` is inert (you can still
change plans directly via the `/billing` page). Add them for real subscriptions.

| Variable                | Where to get it                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | dashboard.stripe.com → **Developers → API keys** → _Secret key_ (`sk_test_…` in test mode).                                                                                            |
| `STRIPE_PRICE_PRO`      | Stripe → **Product catalog** → create a _Product_ "Pro" with a recurring **Price** → copy the Price id (`price_…`).                                                                    |
| `STRIPE_WEBHOOK_SECRET` | Stripe → **Developers → Webhooks** → _Add endpoint_ → URL `https://<your-api-host>/webhooks/stripe`, subscribe to `customer.subscription.*` → copy the **Signing secret** (`whsec_…`). |

**Steps:**

1. Use **Test mode** for development.
2. Grab the secret key; create a Pro product + recurring price; copy its `price_…` id.
3. Add the webhook endpoint (use `stripe listen --forward-to localhost:3001/webhooks/stripe` for local
   dev, which prints a `whsec_…`).

---

## 5. Email — Resend — Optional (needed for real emails)

Without these, briefs/alerts write to an in-memory **Stub outbox** (nothing is sent). Locally, the
compose stack also runs **Mailhog** (`http://localhost:8025`) if you wire an SMTP provider later.

| Variable         | Where to get it                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY` | resend.com → **API Keys** → _Create API Key_ (`re_…`).                                                   |
| `EMAIL_FROM`     | A verified sender, e.g. `AIOI <briefs@yourdomain.com>`. Verify the domain in Resend → **Domains** first. |

---

## 6. LLM & app observability — Optional

| Variable                                      | Where to get it                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | cloud.langfuse.com → project → **Settings → API Keys** (`pk-lf-…` / `sk-lf-…`). Traces LLM calls. |
| `LANGFUSE_BASE_URL`                           | `https://cloud.langfuse.com` (or your self-hosted URL).                                           |
| `SENTRY_DSN`                                  | sentry.io → project → **Settings → Client Keys (DSN)**. Error tracking.                           |

---

## 7. Data-source connectors — Optional (per connector)

**All six connectors are implemented**: HackerNews (always on) + GitHub + Hugging Face (no key needed;
a token raises limits) and Reddit + Product Hunt + YouTube (each needs its key, else no-ops). Every one
is official-API, legality-classified, and rate-limit aware. See the `data-source-integration` skill —
official/licensed sources only.

| Variable                                    | Where to get it                                                                                                                                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN` / `GITHUB_QUERY`             | Optional. github.com → Settings → **Developer settings → Personal access tokens** → _fine-grained token_ (public read). **Wired**: ingests emerging AI repos (Search API); token raises 60→5000 req/h. `GITHUB_QUERY` tunes the search (default `topic:llm`). |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | reddit.com/prefs/apps → _create app_ (type **script**; redirect uri `http://localhost:3001`) → client id is under the app name, secret is the `secret` field. **Wired**: the connector then ingests hot posts (app-only OAuth).                               |
| `REDDIT_USER_AGENT`                         | Optional. Reddit requires a descriptive UA; defaults to `web:aioi:v1.0 (…)`. Set your own if you like.                                                                                                                                                        |
| `REDDIT_SUBREDDITS`                         | Optional comma-separated list; defaults to `MachineLearning,LocalLLaMA,artificial,OpenAI,SaaS`.                                                                                                                                                               |
| `PRODUCTHUNT_TOKEN`                         | api.producthunt.com/v2/oauth/applications → create an app → **Developer Token**. **Wired**: ingests top launches (GraphQL v2); no-ops without it.                                                                                                             |
| `YOUTUBE_API_KEY` / `YOUTUBE_QUERY`         | console.cloud.google.com → enable **YouTube Data API v3** → **Credentials → API key**. **Wired**: ingests AI videos (Search); no-ops without it. `YOUTUBE_QUERY` tunes the search (default `AI tools`).                                                       |
| `HUGGINGFACE_TOKEN` / `HF_SORT`             | Optional. huggingface.co → Settings → **Access Tokens** → _New token_ (read). **Wired**: ingests top models (Hub API); works unauthenticated, token raises the limit. `HF_SORT` = likes \| downloads \| createdAt.                                            |

---

## Minimum to run

Just Docker + the two DB URLs (already defaulted). Everything else can stay blank — the platform boots
green in stub mode. Next: [RUNNING_LOCALLY.md](./RUNNING_LOCALLY.md).
