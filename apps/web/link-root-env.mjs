// Symlink apps/web/.env -> ../../.env so Next.js natively loads the monorepo-root env in EVERY runtime
// (server, edge/proxy, and NEXT_PUBLIC_* inlining). Next only auto-loads .env from the app directory,
// and Turbopack inlines NEXT_PUBLIC_* only from .env files it discovers — so Clerk (secret + publishable)
// and the DB vars must reach the app via a real .env file here, not just the shell or next.config.
//
// Idempotent + keyless-safe: only creates the link when a root .env exists; otherwise no-op (dev/CI
// run green with no keys, and Vercel injects env natively). The link itself is git-ignored.
import { existsSync, lstatSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(here, "../../.env");
const link = join(here, ".env");

const linkExists = () => {
  try {
    lstatSync(link); // lstat: true even for a broken/existing symlink
    return true;
  } catch {
    return false;
  }
};

if (existsSync(rootEnv)) {
  try {
    if (linkExists()) rmSync(link, { force: true });
    symlinkSync("../../.env", link); // relative link, resolved from apps/web/
  } catch (err) {
    globalThis.console.warn("[link-root-env] could not link apps/web/.env:", err.message);
  }
} else if (linkExists()) {
  // root .env went away (e.g. keyless CI) — drop a stale link so Next doesn't read a broken symlink
  rmSync(link, { force: true });
}
