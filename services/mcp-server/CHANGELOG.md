# @aioi/mcp-server

## 0.2.0

### Minor Changes

- 739603c: Deeper agent integrations (B-042). The MCP server gains four tools over the public v2 API so coding
  agents can act on the platform's supply×demand intelligence: **`search_opportunities`** (keyword search
  scored trends), **`lookup_entity`** (is this model/MCP/repo tracked? its momentum + linked trends —
  useful when reviewing a repo), **`list_rising_entities`** (fastest-accelerating supply), and
  **`list_recent_funding`** (SEC EDGAR + Crunchbase money, a leading demand signal). Backed by two new
  read routes — **`GET /api/v1/entities`** (tracked supply-side entities with momentum; `sort`, `limit`)
  and **`GET /api/v1/funding`** (recent funding events; `limit`) — added to the self-documenting API
  index. All seven MCP tools are unit-tested; the new DB-backed routes reuse `listTrackedEntities` /
  `listRecentFunding` and were verified against live Postgres. No DB credentials in the MCP server (it
  speaks HTTP to the hosted API).

## 0.1.0

### Minor Changes

- c877966: MCP server: a Model Context Protocol server (stdio) exposing the platform as tools — search_trends,
  get_trend, list_build_now_opportunities — so coding agents (Claude Desktop, Cursor, Claude Code) can
  query live AI opportunities. Talks to the public API over HTTP (AIOI_API_URL); no DB credentials.
