// Root ESLint flat config — re-exports the shared config.
// Each workspace also has its own eslint.config.js pointing here via @aioi/eslint-config.
import config from "@aioi/eslint-config";

export default config;
