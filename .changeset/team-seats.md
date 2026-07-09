---
"@aioi/database": minor
"@aioi/web": minor
---

Team members & roles: a /team page to invite members by email, assign roles, and remove them — every
mutation RBAC-gated (owners/admins) and audit-logged. New members data layer (listMembers, inviteMember,
updateMemberRole, removeMember, canManageMembers) + getDevMembership (current user's role).
