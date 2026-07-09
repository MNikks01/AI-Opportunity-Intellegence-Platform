#!/usr/bin/env node
/**
 * @aioi/mcp-server — a Model Context Protocol server exposing AI Opportunity Intelligence as tools, so a
 * coding agent (Claude Desktop, Cursor, …) can ask for trends, opportunities, and build plans. Talks to
 * the hosted public API over HTTP (set AIOI_API_URL); no database credentials required. Runs on stdio.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "./client.js";
import { TOOL_SPECS, runTool } from "./tools.js";

const client = createClient();

const server = new Server(
  { name: "aioi-opportunity-intelligence", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: TOOL_SPECS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const text = await runTool(client, request.params.name, request.params.arguments ?? {});
    return { content: [{ type: "text", text }] };
  } catch (err) {
    return {
      content: [
        { type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr — stdout is the JSON-RPC channel.
  console.error("AIOI MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
