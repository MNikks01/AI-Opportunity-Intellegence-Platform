---
"@aioi/database": minor
---

Add `listTrendsPage({ source, sort, page, pageSize })` — source-filtered, sortable (newest or highest
opportunity score), paginated trend browsing. Score-sort orders ids via raw SQL (to-many relation) then
hydrates. Backs the new trends browse controls.
