---
"@aioi/database": minor
---

Add `bootstrapUser({ clerkId, email, name })`: idempotent first-sign-in provisioning of a user's
tenant (User + personal Organization + OWNER Membership + personal Workspace) in one transaction that
sets the org context for the RLS-protected Workspace insert (B-015).
