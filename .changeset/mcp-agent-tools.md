---
"@aioi/mcp-server": minor
"@aioi/web": minor
---

Deeper agent integrations (B-042). The MCP server gains four tools over the public v2 API so coding
agents can act on the platform's supply×demand intelligence: **`search_opportunities`** (keyword search
scored trends), **`lookup_entity`** (is this model/MCP/repo tracked? its momentum + linked trends —
useful when reviewing a repo), **`list_rising_entities`** (fastest-accelerating supply), and
**`list_recent_funding`** (SEC EDGAR + Crunchbase money, a leading demand signal). Backed by two new
read routes — **`GET /api/v1/entities`** (tracked supply-side entities with momentum; `sort`, `limit`)
and **`GET /api/v1/funding`** (recent funding events; `limit`) — added to the self-documenting API
index. All seven MCP tools are unit-tested; the new DB-backed routes reuse `listTrackedEntities` /
`listRecentFunding` and were verified against live Postgres. No DB credentials in the MCP server (it
speaks HTTP to the hosted API).
