// @aioi/eslint-config — shared flat config (ESLint 9).
// Consumed by every package/app/service via `eslint.config.js` -> export from here.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Base config shared by all workspaces. */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
    },
  },
  {
    ignores: ["dist/**", ".next/**", ".turbo/**", "coverage/**", "**/*.config.*"],
  },
);
