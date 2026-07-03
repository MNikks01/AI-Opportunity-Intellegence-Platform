#!/usr/bin/env bash
# scaffold-workspaces.sh — generate leaf workspace stubs (package.json, tsconfig, eslint, index).
# Idempotent: safe to re-run; overwrites the generated stub files only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# name|desc  (node libraries)
LIB_NODE=(
  "shared|Shared domain types, constants, and the core object model (Signal/Trend/Score/Entity)."
  "validation|Zod schemas shared across RHF, tRPC, REST, and ingestion connectors."
  "logger|Structured JSON logging (pino) with request/trace correlation."
  "database|Prisma client + schema + migrations (Postgres + pgvector)."
  "ai-sdk|The only path to LLMs: LiteLLM gateway + Langfuse + scoring/eval contracts."
  "auth|Auth adapter (Clerk today) + RBAC permission checks. Swappable behind this interface."
  "analytics|Product analytics + telemetry event definitions."
  "config|Typed runtime config + feature flags."
)
# name|desc (react libraries)
LIB_REACT=(
  "ui|Design-system components (tokens, primitives, composite) — see docs/03-design/DESIGN_SYSTEM.md."
)
# name|desc (node services)
SERVICES=(
  "api|Fastify: tRPC (internal) + REST/OpenAPI (public) + WebSocket. Single business-logic layer."
  "ai-service|Scoring (opportunity-scoring-engine), RAG, and action-plan generation; eval-gated."
  "ingestion-service|Source workers: fetch, validate, dedupe, emit signal.ingested. Legality-gated."
  "scheduler|Cron + BullMQ repeatable jobs that drive ingestion and trend recompute."
  "notification-service|Alerts, briefs, and signed webhooks (email/Slack/Discord/Telegram)."
)
# name|desc (next apps)
APPS=(
  "web|Authenticated product app (dashboards, trend detail, workspace)."
  "admin|Internal admin panel (users/orgs/audit/flags/source-health) — role-gated."
  "marketing|Public landing, pricing, blog, changelog, roadmap (SEO/ISR)."
  "docs|Product + API documentation and help center."
)

pkg_json_lib() { # dir name desc tsconfig
  cat > "$1/package.json" <<JSON
{
  "name": "@aioi/$2",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "description": "$3",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -w -p tsconfig.json",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "clean": "rm -rf dist .turbo *.tsbuildinfo"
  },
  "devDependencies": {
    "@aioi/eslint-config": "workspace:*",
    "@aioi/tsconfig": "workspace:*"
  }
}
JSON
}

pkg_json_service() { # dir name desc
  cat > "$1/package.json" <<JSON
{
  "name": "@aioi/$2",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "$3",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "clean": "rm -rf dist .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@aioi/shared": "workspace:*",
    "@aioi/validation": "workspace:*",
    "@aioi/logger": "workspace:*"
  },
  "devDependencies": {
    "@aioi/eslint-config": "workspace:*",
    "@aioi/tsconfig": "workspace:*"
  }
}
JSON
}

pkg_json_app() { # dir name desc
  cat > "$1/package.json" <<JSON
{
  "name": "@aioi/$2",
  "version": "0.0.0",
  "private": true,
  "description": "$3",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "clean": "rm -rf .next .turbo"
  },
  "dependencies": {
    "@aioi/ui": "workspace:*",
    "@aioi/shared": "workspace:*"
  },
  "devDependencies": {
    "@aioi/eslint-config": "workspace:*",
    "@aioi/tsconfig": "workspace:*"
  }
}
JSON
}

tsconfig_file() { # dir base
  cat > "$1/tsconfig.json" <<JSON
{
  "extends": "@aioi/tsconfig/$2",
  "include": ["src", "*.ts", "*.tsx"],
  "exclude": ["node_modules", "dist", ".next"]
}
JSON
}

eslint_file() { # dir
  cat > "$1/eslint.config.js" <<'JS'
import config from "@aioi/eslint-config";
export default config;
JS
}

index_stub() { # dir name desc
  cat > "$1/src/index.ts" <<TS
/**
 * @aioi/$2
 * $3
 *
 * Skeleton stub (Phase 17). Implementation begins in Phase 23 per docs/09-process/ROADMAP.md.
 */
export const PACKAGE_NAME = "@aioi/$2" as const;
TS
}

echo "Scaffolding node libraries…"
for e in "${LIB_NODE[@]}"; do n="${e%%|*}"; d="${e#*|}"; dir="packages/$n"
  pkg_json_lib "$dir" "$n" "$d"; tsconfig_file "$dir" "node-service.json"; eslint_file "$dir"; index_stub "$dir" "$n" "$d"; done

echo "Scaffolding react libraries…"
for e in "${LIB_REACT[@]}"; do n="${e%%|*}"; d="${e#*|}"; dir="packages/$n"
  pkg_json_lib "$dir" "$n" "$d"; tsconfig_file "$dir" "react-library.json"; eslint_file "$dir"; index_stub "$dir" "$n" "$d"; done

echo "Scaffolding services…"
for e in "${SERVICES[@]}"; do n="${e%%|*}"; d="${e#*|}"; dir="services/$n"
  pkg_json_service "$dir" "$n" "$d"; tsconfig_file "$dir" "node-service.json"; eslint_file "$dir"; index_stub "$dir" "$n" "$d"; done

echo "Scaffolding apps…"
for e in "${APPS[@]}"; do n="${e%%|*}"; d="${e#*|}"; dir="apps/$n"
  pkg_json_app "$dir" "$n" "$d"; tsconfig_file "$dir" "nextjs.json"; eslint_file "$dir"
  cat > "$dir/README.md" <<MD
# @aioi/$n

$d

Next.js app scaffold (Phase 17). Initialize the App Router (\`app/\`) and wire \`@aioi/ui\` during
Phase 23. See docs/03-design/ for design system + IA and docs/01-product/ for scope.
MD
done

echo "Done."
