import { defineConfig } from "vitest/config";

// Root Vitest config — runs unit/integration tests across all workspaces.
// Workspace packages resolve via node_modules (hoisted linker); TS resolves via Bundler mode.
export default defineConfig({
  test: {
    include: [
      "packages/**/src/**/*.test.{ts,tsx}",
      "services/**/src/**/*.test.{ts,tsx}",
      "apps/**/src/**/*.test.{ts,tsx}",
    ],
    environment: "node",
    passWithNoTests: true,
  },
});
