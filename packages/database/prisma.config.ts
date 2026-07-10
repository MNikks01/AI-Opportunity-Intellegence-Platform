import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 config (B-025). Connection URLs live here (and in the runtime driver adapter, see
 * `src/client.ts`) rather than in `schema.prisma`. The CLI uses `datasource.url` for `migrate` /
 * `db execute`, which must be the **owner** role (`DATABASE_URL`) — the restricted `aioi_app` role
 * (`APP_DATABASE_URL`) is used only by the runtime client so RLS enforces (ADR-0003 / B-027).
 *
 * We load the monorepo-root `.env` (this package has none of its own) and fall back to a localhost URL
 * so `prisma generate` — which never connects — succeeds during `pnpm install` even with no DB
 * configured. A real `DATABASE_URL` is required for `migrate`/`db execute` (they connect).
 */
for (const p of [resolve(process.cwd(), "../../.env"), resolve(process.cwd(), ".env")]) {
  if (existsSync(p)) loadEnv({ path: p });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/aioi",
  },
});
