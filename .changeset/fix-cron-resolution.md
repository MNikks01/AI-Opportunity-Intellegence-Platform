---
---

Fix the scheduled demo-data refresh: import @aioi/database by relative path (it is not linked into the repo-root node_modules, so the package name failed to resolve under tsx in CI).
