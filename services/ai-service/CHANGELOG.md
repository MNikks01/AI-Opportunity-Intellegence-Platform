# @aioi/ai-service

## 0.8.1

### Patch Changes

- Updated dependencies [c4f03ca]
  - @aioi/database@0.27.1

## 0.8.0

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

### Patch Changes

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

- Updated dependencies [8640a94]
- Updated dependencies [5bce17e]
- Updated dependencies [a318f3e]
- Updated dependencies [09d03cb]
- Updated dependencies [246143f]
- Updated dependencies [538c880]
- Updated dependencies [195a5c5]
- Updated dependencies [46cad64]
- Updated dependencies [9f0b508]
  - @aioi/database@0.27.0
  - @aioi/intel-core@0.2.0
  - @aioi/shared@0.3.0
  - @aioi/ai-sdk@0.8.0
  - @aioi/validation@0.5.0

## 0.7.9

### Patch Changes

- Updated dependencies [3e0c633]
  - @aioi/database@0.26.1

## 0.7.8

### Patch Changes

- Updated dependencies [ad749a4]
- Updated dependencies [b6bf357]
- Updated dependencies [62a79b6]
  - @aioi/database@0.26.0
  - @aioi/validation@0.4.0
  - @aioi/ai-sdk@0.7.1

## 0.7.7

### Patch Changes

- Updated dependencies [e07f082]
- Updated dependencies [157b114]
  - @aioi/database@0.25.0

## 0.7.6

### Patch Changes

- Updated dependencies [eb1fc88]
- Updated dependencies [e6dd752]
- Updated dependencies [6a8f4d4]
- Updated dependencies [b902d2c]
- Updated dependencies [b80c3c5]
- Updated dependencies [9d6d986]
- Updated dependencies [7daf15f]
- Updated dependencies [8a17bc7]
- Updated dependencies [4011ff2]
- Updated dependencies [7edad2e]
- Updated dependencies [d3eec43]
- Updated dependencies [7d8b33c]
  - @aioi/database@0.24.0
  - @aioi/ai-sdk@0.7.0

## 0.7.5

### Patch Changes

- Updated dependencies [ea8c984]
  - @aioi/database@0.23.1

## 0.7.4

### Patch Changes

- Updated dependencies [d122844]
  - @aioi/database@0.23.0

## 0.7.3

### Patch Changes

- Updated dependencies [a890f98]
- Updated dependencies [1009efc]
- Updated dependencies [a8f0a49]
  - @aioi/database@0.22.0

## 0.7.2

### Patch Changes

- Updated dependencies [149dd8d]
  - @aioi/database@0.21.0

## 0.7.1

### Patch Changes

- Updated dependencies [89fa03c]
- Updated dependencies [f6907ac]
  - @aioi/database@0.20.0

## 0.7.0

### Minor Changes

- 2d70e24: Opt-in backfill re-score: `pnpm rescore` upgrades existing (Stub-era) trend scores to the configured
  real model, overwriting in place. Batched + queue-rotating (stalest first) so a full backfill runs
  incrementally under cost control; refuses to run on the Stub; RESCORE_DRY estimates without spend.
  New `rescoreTrends` + `listTrendsForRescore`/`touchTrend`/`countScoredTrends`.

### Patch Changes

- Updated dependencies [2d70e24]
- Updated dependencies [746979c]
  - @aioi/database@0.19.0
  - @aioi/shared@0.2.0
  - @aioi/ai-sdk@0.6.1

## 0.6.3

### Patch Changes

- Updated dependencies [dd48ae9]
  - @aioi/database@0.18.0

## 0.6.2

### Patch Changes

- Updated dependencies [e91c90b]
- Updated dependencies [dc47b88]
  - @aioi/database@0.17.0

## 0.6.1

### Patch Changes

- Updated dependencies [13a4d82]
  - @aioi/database@0.16.0

## 0.6.0

### Minor Changes

- bdc16f0: Three additions: (1) CSV/JSON export of the trends view; (2) a polish pass — loading skeletons, keyboard
  focus visibility, a11y touches; (3) optional LLM-powered entity extraction for open-ended discovery
  beyond the curated dictionary (`LLMProvider.extractEntities`, `extractEntitiesForTrends({ useLlm })`).

### Patch Changes

- Updated dependencies [bdc16f0]
  - @aioi/validation@0.3.0
  - @aioi/ai-sdk@0.6.0
  - @aioi/database@0.15.1

## 0.5.0

### Minor Changes

- 20f71a4: Entities directory: extract the recurring AI companies/models/tools/protocols from trends (curated
  keyword dictionary, in the pipeline) and browse them at /entities → each links to the trends it appears
  in. New `entities` data layer, `extractEntities`/`extractEntitiesForTrends`, and two pages + nav.

### Patch Changes

- Updated dependencies [20f71a4]
  - @aioi/database@0.15.0

## 0.4.7

### Patch Changes

- Updated dependencies [0fc7986]
- Updated dependencies [25880d3]
  - @aioi/database@0.14.1

## 0.4.6

### Patch Changes

- Updated dependencies [e7f0515]
- Updated dependencies [0a324c5]
- Updated dependencies [12c676f]
  - @aioi/database@0.14.0

## 0.4.5

### Patch Changes

- Updated dependencies [fbccec0]
- Updated dependencies [05b9e7f]
  - @aioi/database@0.13.0

## 0.4.4

### Patch Changes

- Updated dependencies [ed24c47]
  - @aioi/database@0.12.0

## 0.4.3

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0
  - @aioi/ai-sdk@0.5.1
  - @aioi/database@0.11.3

## 0.4.2

### Patch Changes

- Updated dependencies [1a568dd]
  - @aioi/ai-sdk@0.5.0
  - @aioi/database@0.11.2

## 0.4.1

### Patch Changes

- Updated dependencies [919cf06]
  - @aioi/database@0.11.1

## 0.4.0

### Minor Changes

- 773471d: Close the autonomous loop: clustered trends are now scored. `listUnscoredTrends` +
  `persistScoresForTrend` (@aioi/database) and `scoreClusteredTrends` (@aioi/ai-service) score
  clustering's unscored trends with the opportunity engine (+ embedding + alert eval); a scheduler
  scoring job runs after clustering. Pipeline is now end-to-end: ingest → cluster → score → alerts/briefs.

### Patch Changes

- Updated dependencies [773471d]
  - @aioi/database@0.11.0

## 0.3.0

### Minor Changes

- 2271dca: Tune the clustering cosine threshold for real embeddings: the default drops 0.72 → 0.5 (env-override
  `CLUSTER_THRESHOLD`), so differently-worded, cross-source signals about the same topic actually merge
  into one trend (measured ~0.55 for related, ~0.2 for unrelated). Also quotes special values in
  `.env.example` so `source .env` works.

### Patch Changes

- Updated dependencies [6ae6fa5]
  - @aioi/ai-sdk@0.4.0
  - @aioi/database@0.10.1

## 0.2.1

### Patch Changes

- Updated dependencies [eddca5d]
- Updated dependencies [2126da2]
- Updated dependencies [6035103]
- Updated dependencies [3f93fd8]
  - @aioi/database@0.10.0
  - @aioi/ai-sdk@0.3.0

## 0.2.0

### Minor Changes

- c4ac5c2: LLM eval harness golden gate (B-009): `runEvalHarness` scores/plans a golden trend and checks
  invariants + determinism (10 dims, schema-valid, in-range, evidence-grounded, composite opportunity,
  schema-valid non-empty action plan, deterministic). A test runs it so a regression in AI logic fails CI.
- bc95bde: Signal → Trend clustering (B-006): `clusterSignals` (embed + greedy cosine, deterministic offline via
  the StubEmbedder) + `clusterRecentSignals` orchestration, `listUnclusteredSignals`/
  `createTrendFromSignalIds` in `@aioi/database`, and an hourly scheduler clustering job. Connects
  ingestion → trends.

### Patch Changes

- Updated dependencies [da375de]
- Updated dependencies [bc95bde]
  - @aioi/database@0.9.0

## 0.1.3

### Patch Changes

- Updated dependencies [0d328db]
  - @aioi/database@0.8.0

## 0.1.2

### Patch Changes

- Updated dependencies [2995824]
  - @aioi/database@0.7.0

## 0.1.1

### Patch Changes

- Updated dependencies [5488c28]
- Updated dependencies [dd23ccb]
  - @aioi/database@0.6.0

## 0.1.0

### Minor Changes

- c10faf2: Action-plan generators (B-021): `generateActionPlan` in `@aioi/ai-sdk` (Stub + LiteLLM, schema-validated)

  - `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` with `getTrendBySlug` including
    the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
    page. Also adds `main`/`types` to `@aioi/ai-service` so it can be imported.

### Patch Changes

- Updated dependencies [c10faf2]
- Updated dependencies [4e6f14d]
  - @aioi/ai-sdk@0.2.0
  - @aioi/database@0.5.0
  - @aioi/validation@0.2.0

## 0.0.4

### Patch Changes

- Updated dependencies [5762d93]
- Updated dependencies [486c37f]
- Updated dependencies [e7d23d8]
- Updated dependencies [c01468e]
  - @aioi/database@0.4.0
  - @aioi/ai-sdk@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/database@0.3.0
  - @aioi/validation@0.1.0
  - @aioi/ai-sdk@0.0.1

## 0.0.2

### Patch Changes

- Updated dependencies [c2a8c88]
- Updated dependencies [8a43b68]
  - @aioi/database@0.2.0

## 0.0.1

### Patch Changes

- Updated dependencies [1bc6a1b]
  - @aioi/database@0.1.0
