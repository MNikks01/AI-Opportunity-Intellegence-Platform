-- RLS for WatchlistItem — a child table scoped via its parent Watchlist (it has no direct
-- organizationId). An item is visible/insertable only when its watchlist belongs to the current org
-- (ADR-0003 D3). The EXISTS subquery is itself RLS-filtered (Watchlist is org-scoped), so this is
-- fail-closed with no org context.

ALTER TABLE "WatchlistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WatchlistItem" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "WatchlistItem"
  USING (
    EXISTS (
      SELECT 1 FROM "Watchlist" w
      WHERE w.id = "watchlistId"
        AND w."organizationId" = current_setting('app.current_org', true)::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Watchlist" w
      WHERE w.id = "watchlistId"
        AND w."organizationId" = current_setting('app.current_org', true)::uuid
    )
  );
