-- Restricted application role for RLS enforcement (ADR-0003 / B-027).
-- The app RUNTIME connects as this NON-superuser, NON-BYPASSRLS role (via APP_DATABASE_URL) so RLS
-- policies actually apply. MIGRATIONS keep running as the owner (DATABASE_URL).
--
-- The role is created NOLOGIN with no password here (prod-safe): LOGIN + a password are granted
-- separately by infra from secrets (prod) or by the local/CI setup (dev). Grants below cover current
-- tables + ALTER DEFAULT PRIVILEGES covers tables created by later migrations (run as the owner).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aioi_app') THEN
    CREATE ROLE aioi_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO aioi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aioi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aioi_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aioi_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO aioi_app;
