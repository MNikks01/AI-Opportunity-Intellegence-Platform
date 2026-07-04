---
name: documentation
description: >-
  Deep technical-writing guidance for the AI Opportunity Intelligence Platform — docs, ADRs, API docs,
  READMEs, CHANGELOG, and the public docs/help/blog surfaces. Use when writing or updating any
  documentation, recording a decision, keeping the CHANGELOG current, or reviewing docs for accuracy,
  structure, and house style. Pairs with the installed writing-guidelines skill.
---

# Documentation & Technical Writing

Docs are part of "done", not an afterthought — behavior or a decision changing without a doc/CHANGELOG
update is an incomplete change (CODE_GUIDELINES §9). This repo already has a rich `docs/` tree,
templates (`.claude/templates/`), and a Keep-a-Changelog `CHANGELOG.md`. Follow the installed
`writing-guidelines` skill for prose; this skill covers **what** to write, **where** it lives, and
**how it stays current**. Docs index: [docs/README.md](../../../docs/README.md).

## When to apply

- Writing/updating any doc, README, ADR, API doc, or the CHANGELOG.
- Recording an architectural decision or a behavior change.
- Building public docs/help/blog; reviewing docs for accuracy + style.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Accuracy / no drift | A wrong doc is worse than none; it misleads. |
| **CRITICAL** | Decisions as ADRs | Undocumented decisions get re-litigated + lost. |
| **HIGH** | CHANGELOG discipline | The human record of what changed each release. |
| **HIGH** | Single source of truth | Duplicated docs diverge; link, don't copy. |
| **HIGH** | Right doc, right place | Reference vs guide vs ADR vs API each have a home. |
| **MEDIUM** | Structure & scannability | Headings, tables, examples; readers skim. |
| **MEDIUM** | Audience & voice | Match the reader; concise, active, evidence-first. |

## Where things live

| Type | Home | Template |
|---|---|---|
| Product (PRD, vision) | `docs/01-product/` | `templates/prd.md` |
| Technical (TRD, system, DB, API) | `docs/0{1,2,4,5}-*` | `templates/{trd,architecture,api}.md` |
| Decisions | `docs/adr/ADR-XXXX-*.md` | `templates/adr.md` |
| Process (roadmap, sprint, release) | `docs/09-process/` | `templates/{sprint,release}.md` |
| Engineering release notes | `CHANGELOG.md` | `templates/changelog.md` |
| AI-assistant knowledge | `.claude/` (memory, skills) | — |
| Public docs/help/blog | `apps/docs`, `apps/marketing` | — (see `seo`) |

## Quick reference — the rules

### 1. Accuracy (CRITICAL)
- Docs match the code as merged. If you change behavior, update the doc in the **same PR**. Prefer
  linking to the source of truth over restating it (which drifts). Date/version living docs.

### 2. Decisions → ADRs (CRITICAL)
- Any non-obvious technical decision gets an ADR (context, decision, consequences, alternatives,
  status). Never bury a decision in prose or a commit message. Supersede old ADRs, don't silently edit.

### 3. CHANGELOG (HIGH)
- Every user- or dev-facing change updates `[Unreleased]` under Added/Changed/Fixed/Removed/Security.
  Changesets generate per-package changelogs on release; the root CHANGELOG is the human summary.

### 4. Single source of truth (HIGH)
- One canonical doc per topic; everything else links to it (e.g., `.claude/ROADMAP.md` points to
  `docs/09-process/ROADMAP.md`). Don't copy content between files.

### 5. Structure (MEDIUM)
- Lead with the point (BLUF). Use headings, tables, and code examples. Prefer good/bad examples and
  checklists over long prose. Keep line length reasonable; use relative links.

### 6. Audience & voice (MEDIUM)
- Write for the specific reader (contributor, operator, end user). Concise, active voice, evidence-
  first (mirrors the product's "explainable" ethos). Define terms once (see `.claude/memory/glossary.md`).
  Per `writing-guidelines`.

## Patterns — good vs bad

**Link, don't duplicate:**
```md
<!-- ❌ BAD — restates the roadmap; will drift -->
## Roadmap
Phase 1 done, Phase 2 ...

<!-- ✅ GOOD — one source of truth -->
## Roadmap
See the canonical tracker: [docs/09-process/ROADMAP.md](../docs/09-process/ROADMAP.md).
```

**Record the decision as an ADR (not prose):**
```md
<!-- ✅ GOOD — docs/adr/ADR-0002-auth-swap.md -->
# ADR-0002 — Auth provider
Status: Accepted · Context: … · Decision: Clerk behind @aioi/auth · Consequences: … · Alternatives: Auth.js
```

**CHANGELOG entry with the change:**
```md
### Fixed
- ui: acronym score dimensions render correctly ("SEO" not "Seo").
```

## Step-by-step: document a change

1. Identify the doc type + home (table above); use the matching template.
2. Write BLUF + structure (headings/tables/examples); link canonical sources, don't copy.
3. If a decision was made → add/supersede an ADR.
4. Update `CHANGELOG.md [Unreleased]`; add a changeset for package changes.
5. Update the roadmap/backlog if status changed. Run `writing-guidelines` review.
6. Ship the doc in the **same PR** as the behavior change.

## Decision guide

| To document… | Put it in | Not |
|---|---|---|
| A technical decision | an ADR | a comment/commit msg |
| What changed this release | CHANGELOG | scattered PR descriptions |
| How to do X (contributor) | a guide in `docs/` or CONTRIBUTING | tribal knowledge |
| Reference (schema/API) | generated/`docs/0{4,5}` | hand-copied duplicates |
| Assistant conventions | `.claude/memory` + skills | one-off notes |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Doc contradicts code | not updated with the change | update in the same PR; date it |
| Decision re-litigated | no ADR | write an ADR; link from code/docs |
| "What changed?" unclear | CHANGELOG stale | enforce `[Unreleased]` in DoD |
| Conflicting duplicate docs | copy-paste | one canonical + links |
| Unreadable wall of text | no structure | headings/tables/examples; BLUF |

## Pre-delivery checklist

- [ ] Docs match merged behavior; updated in the same PR; living docs dated/versioned
- [ ] Non-obvious decisions captured as ADRs (context/decision/consequences/alternatives)
- [ ] `CHANGELOG.md [Unreleased]` updated; changeset added for package changes
- [ ] Single source of truth (links, not copies); correct home + template
- [ ] BLUF + scannable structure (headings/tables/examples); relative links work
- [ ] Audience-appropriate, concise, active voice; terms in glossary
- [ ] `writing-guidelines` review passed

## References
[docs/README](../../../docs/README.md) · `.claude/templates/` · `.claude/memory/glossary.md` ·
[CODE_GUIDELINES §9](../../../docs/08-quality/CODE_GUIDELINES.md) · installed `writing-guidelines`; skills: `seo`, `documentation`.
