# Documentation Index

The `docs/` tree evolves phase by phase per [ROADMAP](09-process/ROADMAP.md). Status is tracked there.

## Structure

| Dir                | Contents                                                                          |
| ------------------ | --------------------------------------------------------------------------------- |
| `00-discovery/`    | Product Discovery, Market Research, Personas, Competitive Analysis _(done)_       |
| `01-product/`      | Vision & Mission, **PRD**, **TRD** _(done)_, User Stories, Feature Prioritization |
| `02-architecture/` | System Design (HLD/LLD), event-driven & microservice arch, scalability            |
| `03-design/`       | UX flows, wireframes, design system, information architecture                     |
| `04-data/`         | Database design, ERD, multi-tenancy                                               |
| `05-api/`          | API design, OpenAPI spec, API documentation                                       |
| `06-infra/`        | Infrastructure, CI/CD, deployment, observability, DR/backup                       |
| `07-security/`     | Security guide, threat model, RBAC, permissions                                   |
| `08-quality/`      | Code guidelines, style guide, testing strategy, performance                       |
| `09-process/`      | Roadmap, milestones, sprint plan, backlog, risk register, release process         |
| `adr/`             | Architecture Decision Records (ADR-0001 = core stack)                             |
| `diagrams/`        | ERD, sequence, flowcharts, component, infrastructure diagrams                     |
| `legal/`           | Privacy Policy, Terms, Cookie Policy templates                                    |

## Completed so far

- Phases 1–6 (Discovery → PRD) + the TRD baseline + ADR-0001.

## Read order for a new contributor

1. [Vision & Mission](01-product/VISION_AND_MISSION.md)
2. [Personas](00-discovery/PERSONAS.md) → [Competitive Analysis](00-discovery/COMPETITIVE_ANALYSIS.md)
3. [PRD](01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md)
4. [TRD](01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) → [ADR-0001](adr/ADR-0001-core-stack.md)
5. [Roadmap](09-process/ROADMAP.md) for what's next.
