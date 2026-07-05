-- Cross-tenant discovery for the alerts pipeline (B-017 auto-eval).
-- "Which orgs watch this trend?" must span tenants, but Watchlist/WatchlistItem are RLS-protected and
-- the runtime connects as the restricted role. A SECURITY DEFINER function (owned by the migration
-- owner) runs with the owner's privileges → bypasses RLS for this narrow, read-only lookup. The runtime
-- (aioi_app) is granted EXECUTE only. `SET search_path` hardens the definer function.

CREATE OR REPLACE FUNCTION app_orgs_watching_trend(p_trend_id text)
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT DISTINCT w."organizationId"
  FROM "Watchlist" w
  JOIN "WatchlistItem" i ON i."watchlistId" = w.id
  WHERE i."targetType" = 'TREND' AND i."targetId" = p_trend_id;
$$;

REVOKE ALL ON FUNCTION app_orgs_watching_trend(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_orgs_watching_trend(text) TO aioi_app;
