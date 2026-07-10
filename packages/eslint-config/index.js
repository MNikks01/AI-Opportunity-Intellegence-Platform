// @aioi/eslint-config — shared flat config (ESLint 9).
// Consumed by every package/app/service via its own `eslint.config.js` -> re-export from here.
// Uses the non-type-checked recommended set for speed/reliability; strict TYPE safety is enforced
// separately by `tsc` (typecheck). Type-aware lint rules are a future hardening (backlog).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/*.config.*",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      // TypeScript itself resolves undefined identifiers (incl. Node globals like `process`/`Buffer`)
      // far more accurately than eslint's static `no-undef`. typescript-eslint recommends disabling the
      // core rule for TS sources; we enforce real undefined-symbol safety via `tsc` (typecheck).
      "no-undef": "off",
    },
  },
);
