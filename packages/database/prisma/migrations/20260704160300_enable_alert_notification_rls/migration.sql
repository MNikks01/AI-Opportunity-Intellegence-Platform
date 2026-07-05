-- RLS for the Alerts feature (B-017), consistent with ADR-0003.
-- Alert is a child of Watchlist (no direct organizationId) → EXISTS-through-parent policy.
-- Notification has a direct organizationId → standard tenant_isolation policy.

-- Alert (child-scoped via its watchlist)
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Alert"
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

-- Notification (direct organizationId)
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Notification"
  USING ("organizationId" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("organizationId" = current_setting('app.current_org', true)::uuid);
