/** Conventional Commits — enforced via Husky commit-msg hook. */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
    ],
    "scope-enum": [
      1,
      "always",
      // packages/apps/services scopes + cross-cutting
      ["web", "admin", "marketing", "docs", "api", "ai-service", "ingestion", "scheduler",
       "notification", "ui", "ai-sdk", "database", "auth", "shared", "validation", "logger",
       "analytics", "config", "cache", "billing", "infra", "ci", "deps", "release"],
    ],
  },
};
