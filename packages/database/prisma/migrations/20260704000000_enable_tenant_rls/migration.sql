-- Enable Row-Level Security (tenant isolation) on org-scoped tables.
-- The app connects as the table owner, so FORCE ROW LEVEL SECURITY is required for policies to apply.
-- The org is set per-transaction via set_config('app.current_org', <uuid>, true) — see
-- @aioi/database `withOrgContext`. Fail-closed: with no org set, current_setting(...,true) is NULL and
-- no rows match (USING) and no inserts are allowed (WITH CHECK).
--
-- Scope: tables with a direct `organizationId`, EXCLUDING Membership (part of the auth graph, gated by
-- app-layer RBAC) and Organization/User (root). Child-scoped tables (Report/WatchlistItem/Alert, keyed
-- via a parent) get EXISTS-based policies when their CRUD lands (B-014 cont.).

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Workspace','Watchlist','ApiKey','AuditLog','Brief','Subscription'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING ("organizationId" = current_setting(''app.current_org'', true)::uuid) '
      || 'WITH CHECK ("organizationId" = current_setting(''app.current_org'', true)::uuid)',
      t
    );
  END LOOP;
END $$;
