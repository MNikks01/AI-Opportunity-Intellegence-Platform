# @aioi/mcp-server

## 0.1.0

### Minor Changes

- c877966: MCP server: a Model Context Protocol server (stdio) exposing the platform as tools — search_trends,
  get_trend, list_build_now_opportunities — so coding agents (Claude Desktop, Cursor, Claude Code) can
  query live AI opportunities. Talks to the public API over HTTP (AIOI_API_URL); no DB credentials.
