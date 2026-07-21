# @aioi/validation

## 0.5.0

### Minor Changes

- 09d03cb: AI & Tech Intelligence vertical — M4 (per-article analysis). Adds the full per-article analysis pipeline
  (ADR-0009): `LLMProvider.analyzeSignal` (Stub + LiteLLM) producing a schema-validated payload — TLDR,
  executive summary, the nine opportunity axes (business/career/learning/content/investment/automation/
  startup/developer/freelancing, each a 1–100 score + grounded "why"), difficulty, companies, tech, skills,
  region, categories, and action items (`signalAnalysisContentSchema`). The `analyzeSignals` driver runs
  the three cost guardrails in order — rules relevance gate (no spend on off-topic), content-hash cache
  (identical/reposted articles reuse an existing analysis), and a per-run model-call budget cap — then
  persists `SignalAnalysis` + `SignalCategory` (`upsertSignalAnalysis`, `findAnalysisByContentHash`,
  `listSignalsForAnalysis`). The prompt is versioned (`signal-analysis-v1`) and gated by the extended
  llm-eval-harness (schema-validity, determinism, axis ranges, valid categories, gate behavior). Design:
  AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
- 538c880: AI & Tech Intelligence vertical — M6 (public API + filters). New `/api/v1` read endpoints on the existing
  envelope/auth/rate-limit stack: `GET /news` (feed with `q` hybrid search, region/category/minOpportunity/
  sinceDays filters, sort, limit), `GET /news/{id}` (full analysis payload), `GET /categories` (taxonomy),
  and `GET /models` (open-source model tracker). Backed by `listNews` / `getNewsItem` / `listModelCards`
  in @aioi/database, and one shared `newsFilterSchema` (@aioi/validation) that validates the REST query
  params (coerced) and is reusable by tRPC + the web filter form. Design: AI_TECH_INTELLIGENCE_MODULE.md;
  ADR-0009.
- 46cad64: AI & Tech Intelligence vertical — M8 (news alerts). Adds a `PUSH` alert channel, Telegram delivery, and
  region/category/model news subscriptions:

  - migration: `PUSH` on `AlertChannel`; `telegramBotToken`/`telegramChatId` on `OrgIntegration`; and the
    `app_orgs_watching_topic` SECURITY DEFINER function (cross-tenant topic discovery, mirroring
    `app_orgs_watching_trend`).
  - notification-service: `formatTelegramDigest` + `postTelegram` (Bot API `sendMessage`, HTML), wired into
    `deliverDigest` alongside Slack/Discord.
  - database: TOPIC-subscription matcher — a signal's region/category/model map to topic ids
    (`region:US`, `category:ai-models`, `model:llama`) via `newsTopicTargets`; `evaluateSignalAllOrgs`
    fans out cross-tenant and `evaluateSignalForOrg` writes a deduped in-app Notification per org.
  - ai-service: the analysis pass fires the news-alert fan-out (best-effort) after persisting an analysis.
    Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.

## 0.4.0

### Minor Changes

- b6bf357: Watch + alert on a tracked entity (M15-A phase 2, B-032). You can now **watch** a supply-side entity
  (model / MCP server / repo) from its detail page and be alerted when it's **accelerating**.

  - New `ENTITY_MOMENTUM` alert trigger (`@aioi/validation`); the watchlist alert form offers "Entity
    accelerating".
  - `evaluateEntityAlertsAllOrgs` (run in the pipeline after entity snapshots) notifies each org whose
    watched entities are accelerating — reusing the existing watchlist + alert + Notification primitives,
    RLS-scoped, and **de-duped** (one unread notification per entity per alert).
  - A watch toggle on `/entities/{id}` (tracked types only), via the existing primary-watchlist flow.

  Pure `entityMomentumMatches` + a live-DB integration test (notify + de-dupe).

## 0.3.0

### Minor Changes

- bdc16f0: Three additions: (1) CSV/JSON export of the trends view; (2) a polish pass — loading skeletons, keyboard
  focus visibility, a11y touches; (3) optional LLM-powered entity extraction for open-ended discovery
  beyond the curated dictionary (`LLMProvider.extractEntities`, `extractEntitiesForTrends({ useLlm })`).

## 0.2.0

### Minor Changes

- c10faf2: Action-plan generators (B-021): `generateActionPlan` in `@aioi/ai-sdk` (Stub + LiteLLM, schema-validated)

  - `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` with `getTrendBySlug` including
    the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
    page. Also adds `main`/`types` to `@aioi/ai-service` so it can be imported.

## 0.1.0

### Minor Changes

- 5d583c8: Alerts engine (B-017): a `Notification` model, org-scoped alert + notification repositories, a pure
  trigger matcher (`NEW_TREND`/`SCORE_CROSSES`), and `evaluateTrendForOrg` that writes in-app
  notifications for matched alerts. Adds `alerts`/`notifications` tRPC routers (protected + RBAC) and RLS
  on `Alert` (EXISTS-via-parent) and `Notification` (direct-org).
- 0634493: Watchlists CRUD (B-016): org-scoped watchlist/item repository (`withOrgContext`), a `watchlists` tRPC
  router (protected + RBAC `watchlists:read`/`:write`), shared Zod schemas, and RLS on `WatchlistItem`
  (EXISTS-via-parent policy). Cross-tenant isolation for watchlists and items proven by integration tests.
