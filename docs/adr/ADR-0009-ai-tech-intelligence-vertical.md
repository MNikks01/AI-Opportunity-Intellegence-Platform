# ADR-0009 — AI & Technology Intelligence module as a vertical on the existing pipeline

- **Status:** Accepted (2026-07-21) — operator approved; M1 (taxonomy + schema) implemented.
- **Date:** 2026-07-21
- **Deciders:** Founder/operator (cost owner), Architect
- **Context source:** "Build an AI & Technology Intelligence Module" brief;
  [AI_TECH_INTELLIGENCE_MODULE](../02-architecture/AI_TECH_INTELLIGENCE_MODULE.md)

## Context

The brief requests a production module that collects, categorizes, analyzes, scores, and displays AI/tech
news worldwide, with per-article opportunity analysis, model tracking, semantic search, a dashboard, and
alerts. The repository **already implements** a domain-general trend-intelligence pipeline
(`Source → Signal → Trend → Entity → Score → ActionPlan → Watchlist/Alert`) with pgvector search, RLS
multi-tenancy, billing, 16 connectors, and a 20+ page dashboard. Roughly 75% of the brief already exists.
Building a parallel system would duplicate ~200 commits of work and violate "simplicity first / surgical
changes." The module should be a **vertical extension**, reusing every layer.

Two decisions materially change the architecture and are the operator's to make.

## Decision 1 — Analysis unit: per-article, with cost guardrails

**Chosen:** Run the full opportunity analysis **per article (Signal)**, as the brief is written.

- **Alternatives considered:** (a) _Hybrid_ — cheap per-signal classification + expensive analysis only
  on clustered Trends (architect's recommendation, lowest cost, strongest "leading-indicator" USP);
  (b) _Trend-only_ — no per-article analysis.
- **Trade-off accepted:** per-article LLM analysis is 10–50× the cost of the trend-only model and leans
  the product toward a news-site UX rather than the "spot it before everyone" clustering USP. The
  operator accepted this explicitly.
- **Mandatory mitigations (part of this decision):** relevance gate before any expensive call; model
  tiering (cheap classify → capable analyze); content-hash cache (re-runs free unless prompt version
  bumps); dedupe-first; per-window budget cap. "LLM cost per active user" is tracked as a release metric
  and is a stop-ship signal if it breaches the PRD budget.

## Decision 2 — Score axes: reuse existing 10 dimensions; new axes as payload fields

**Chosen:** Do **not** migrate the `ScoreDimension` enum. Canonical numeric `Score` rows remain the
existing 10 dimensions. The brief's 9 opportunity axes are delivered as narrative + sub-scores inside
`SignalAnalysis.payload`.

- **Rationale:** avoids an enum migration and a new eval gate on canonical dimensions; the five axes with
  no enum home (Career, Learning, Automation, Startup, Freelancing) are inherently more qualitative and
  fit a payload sub-score with rationale. Mapping: Business→BUSINESS, Developer→DEVELOPER,
  Investment→MONETIZATION, Content→CREATOR/SEO, Startup→composite; the rest are LLM narrative sub-scores.
- **Consequence:** the per-article **analysis prompt** still requires its own versioned golden set under
  `llm-eval-harness` before M4 ships — the canonical scoring rubric is untouched, but the new payload is
  a new evaluated surface.

## Consequences

- Additive, lock-safe migration (new tables + nullable columns); no destructive change to `Signal`.
- New `packages/intel-core` (normalization/taxonomy/relevance) is pure and independently testable.
- Delivery proceeds M1→M9 (see the design doc), each module gated by tests + docs + (where AI) evals.
- **No code is written until this ADR is Accepted.**

## Data-source note

All sources remain OFFICIAL/licensed. X, LinkedIn, and unofficial Google Trends stay excluded per the
non-negotiable data-source rule. New paid sources (if any) would need their own ADR, like ADR-0008.
