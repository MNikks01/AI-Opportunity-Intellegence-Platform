-- Harden RLS (robustness). `current_setting('app.current_org', true)` returns '' (not NULL) once the
-- GUC placeholder has been touched on a pooled connection, so `::uuid` threw on RLS queries made
-- outside withOrgContext. Wrap with NULLIF(...,'') so an unset/empty org is NULL → fail-closed (no
-- rows / no writes) instead of an error. Recreates every tenant_isolation policy.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Workspace','Watchlist','ApiKey','AuditLog','Brief','Subscription','Notification'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING ("organizationId" = NULLIF(current_setting(''app.current_org'', true), '''')::uuid) '
      || 'WITH CHECK ("organizationId" = NULLIF(current_setting(''app.current_org'', true), '''')::uuid)',
      t
    );
  END LOOP;
END $$;

-- Child-scoped tables (EXISTS via parent watchlist).
DROP POLICY IF EXISTS tenant_isolation ON "WatchlistItem";
CREATE POLICY tenant_isolation ON "WatchlistItem"
  USING (EXISTS (SELECT 1 FROM "Watchlist" w WHERE w.id = "watchlistId"
    AND w."organizationId" = NULLIF(current_setting('app.current_org', true), '')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM "Watchlist" w WHERE w.id = "watchlistId"
    AND w."organizationId" = NULLIF(current_setting('app.current_org', true), '')::uuid));

DROP POLICY IF EXISTS tenant_isolation ON "Alert";
CREATE POLICY tenant_isolation ON "Alert"
  USING (EXISTS (SELECT 1 FROM "Watchlist" w WHERE w.id = "watchlistId"
    AND w."organizationId" = NULLIF(current_setting('app.current_org', true), '')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM "Watchlist" w WHERE w.id = "watchlistId"
    AND w."organizationId" = NULLIF(current_setting('app.current_org', true), '')::uuid));
