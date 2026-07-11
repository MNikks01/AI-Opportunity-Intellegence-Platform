// Build the MV3 extension (ADR-0007): bundle the popup with esbuild + copy static assets into dist/.
import { build } from "esbuild";
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: {
    popup: join(root, "src", "popup.ts"),
    content: join(root, "src", "content.ts"),
  },
  outdir: dist,
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["chrome110", "firefox110"],
  legalComments: "none",
});

// Copy manifest + HTML/CSS (everything in public/) alongside the bundle.
for (const file of readdirSync(join(root, "public"))) {
  cpSync(join(root, "public", file), join(dist, file));
}

console.log("extension built → dist/ (load-unpacked in chrome://extensions)");
