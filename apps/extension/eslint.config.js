import config from "@aioi/eslint-config";

export default [
  ...config,
  // The esbuild build script and the built bundle aren't app source.
  { ignores: ["dist/**", "build.mjs"] },
];
