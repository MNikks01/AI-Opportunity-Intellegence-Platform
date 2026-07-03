# API Design

**Phase 14 · Status: complete · Last updated: 2026-07-03**
**Traces to:** [TRD §2 D2](../01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · [DB Design](../04-data/DATABASE_DESIGN.md) · [OpenAPI](openapi.yaml)

## 1. Surfaces
- **Internal (web ⇄ api): tRPC v11.** End-to-end types, no codegen, Zod input/output shared with
  `packages/validation`. Organized by router: `trends`, `opportunities`, `entities`, `watchlists`,
  `alerts`, `briefs`, `search`, `workspace`, `org`, `billing`, `admin`.
- **External (public): REST + OpenAPI 3.1** under `/api/v1`. For the browser extension, integrations,
  and third-party developers. Documented in `openapi.yaml`, published to `docs.*`.
- **Realtime: WebSocket** channels (`org:{id}:alerts`, `trend:{id}`) for live alerts + score updates.
- **Webhooks (outbound):** signed events (`trend.matched`, `alert.fired`, `report.ready`) to
  Slack/Discord/Telegram/customer endpoints; HMAC-signed, verified, retried.

## 2. Conventions (both surfaces)
- **Auth:** web = Clerk session (tRPC context); public = `Authorization: Bearer <api_key>` (hashed,
  scoped, rate-limited, metered). JWTs (short access + rotating refresh) for first-party mobile/extension.
- **Errors:** RFC 9457 problem+json for REST; typed `TRPCError` internally. Envelope:
  `{ type, title, status, detail, instance, code }`. Never leak internals.
- **Pagination:** cursor-based (`?cursor=&limit=`), `limit` ≤ 100, response `{ data, nextCursor }`.
- **Filtering/sorting:** whitelisted fields only; `?filter[dimension]=opportunity&filter[band]=high&sort=-value`.
- **Idempotency:** `Idempotency-Key` header on POST/writes; dedup 24h.
- **Rate limits:** per-key + per-IP (Redis token bucket); `RateLimit-*` headers; 429 + `Retry-After`.
- **Versioning:** URL-versioned (`/api/v1`); additive changes only within a version; deprecation headers.
- **Validation:** Zod at the boundary; invalid → 422 with field errors. RBAC checked before handler.
- **Observability:** every request traced (OTel), audit-logged if mutating, cost-tagged if it triggers AI.

## 3. Core REST resources (`/api/v1`)
| Method & path | Purpose | Scope |
|---|---|---|
| `GET /trends` | list/filter/sort trends (+scores summary) | `trends:read` |
| `GET /trends/{id}` | trend detail: scores + evidence + action plan | `trends:read` |
| `GET /trends/{id}/scores` | full scorecard | `trends:read` |
| `GET /opportunities` | trends via opportunity lens (score filters) | `trends:read` |
| `GET /entities/{type}/{id}` | company/model/repo/... detail + trends | `entities:read` |
| `GET /search?q=&mode=keyword\|semantic` | search trends/entities | `search:read` |
| `GET/POST /watchlists`, `GET/PATCH/DELETE /watchlists/{id}` | manage watchlists | `watchlists:*` |
| `POST /watchlists/{id}/items`, `DELETE …/items/{itemId}` | track/untrack | `watchlists:write` |
| `GET/POST /alerts`, `PATCH/DELETE /alerts/{id}` | alert rules | `alerts:*` |
| `GET /briefs`, `GET /briefs/{id}` | briefs (read + delivery status) | `briefs:read` |
| `GET/POST /reports`, `GET /reports/{id}` (+ `?format=pdf`) | reports/exports | `reports:*` |
| `POST /api-keys`, `GET /api-keys`, `DELETE /api-keys/{id}` | key lifecycle | `org:admin` |
| `GET /me`, `GET /org` | identity + org context | authed |
| `POST /webhooks/stripe` | Stripe events (verified signature) | system |

## 4. Example (trend detail response — shape)
```jsonc
{
  "id": "…", "slug": "mcp-servers-local-models", "title": "MCP servers for local models",
  "status": "ACTIVE", "summary": "…executive summary…",
  "scores": [
    { "dimension": "opportunity", "value": 82, "band": "high", "confidence": 0.74,
      "rationale": "…", "evidence": ["signal:…","entity:…"], "rubricVersion": "2026-07-01" }
    /* …10 dimensions… */
  ],
  "actionPlan": { "saasIdeas": ["…"], "keywords": ["…"], "techStack": ["…"], /* … */ },
  "entities": [{ "type": "repo", "id": "…", "name": "…", "role": "leading" }],
  "signals": [{ "source": "github", "url": "…", "publishedAt": "…" }]
}
```

## 5. tRPC ↔ REST parity
REST read models are generated views over the same service layer the tRPC routers call — single
business-logic layer (`services/api/src/modules/*`), two transports. No logic duplicated.

## 6. Review checklist
- [x] Internal tRPC + public REST/OpenAPI justified and both specified.
- [x] Auth, errors (RFC 9457), pagination, rate limits, idempotency, versioning conventions set.
- [x] Every resource maps to a DB entity + RBAC scope.
- [x] Scorecard response matches the `score.schema.json` contract.
- [x] Webhooks signed/verified; Stripe webhook isolated.
