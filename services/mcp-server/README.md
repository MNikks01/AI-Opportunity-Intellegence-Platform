# @aioi/mcp-server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes **AI Opportunity
Intelligence** to coding agents (Claude Desktop, Cursor, Claude Code, …). Ask your agent things like
_"what AI opportunities are breaking out right now?"_ and it queries the live platform.

It talks to the hosted **public API** over HTTP — no database credentials required.

## Tools

| Tool                           | What it does                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `search_trends`                | Scored AI trends (opportunity 0-100 + top build idea). Args: `limit`, `source`, `sort`.     |
| `get_trend`                    | One trend's full detail: 10-dimension scores, momentum, entities, build plan. Args: `slug`. |
| `list_build_now_opportunities` | The Golden-Quadrant "build now" list (high demand, low supply). Args: `limit`.              |

## Configure

Set `AIOI_API_URL` to your deployment (defaults to the public demo).

**Claude Desktop / Claude Code** (`claude_desktop_config.json` or MCP settings):

```json
{
  "mcpServers": {
    "aioi": {
      "command": "node",
      "args": ["/absolute/path/to/services/mcp-server/dist/index.js"],
      "env": { "AIOI_API_URL": "https://your-deployment.example.com" }
    }
  }
}
```

Build first with `pnpm --filter @aioi/mcp-server build`. During development, use
`args: ["tsx", "src/index.ts"]` (or run `pnpm --filter @aioi/mcp-server dev`).
