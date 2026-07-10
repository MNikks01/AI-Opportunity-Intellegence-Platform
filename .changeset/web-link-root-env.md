---
"@aioi/web": patch
---

Local dev: symlink the monorepo-root `.env` into `apps/web`. A new idempotent, keyless-safe
`apps/web/link-root-env.mjs` (wired into `dev`/`build`/`start`) links `apps/web/.env` → `../../.env` so
Next.js/Turbopack natively load the root env (Clerk keys, DB URLs, `NEXT_PUBLIC_*`) in every runtime.
No-op when there's no root `.env` (keyless CI, and Vercel injects env natively), and the generated
symlink is git-ignored. This is the file `DEPLOYMENT_GUIDE.md` already referenced but that was never
actually committed. Salvaged from the abandoned `fix/clerk-next16-proxy` branch (its package.json was a
stale snapshot; only the env-link mechanism was kept).
