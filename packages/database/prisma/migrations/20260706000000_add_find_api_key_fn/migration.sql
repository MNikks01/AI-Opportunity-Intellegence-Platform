-- API-key auth lookup (B-014 cont.). At auth time the org isn't known yet, and ApiKey is RLS-protected,
-- so a SECURITY DEFINER function (owner-privileged, read-only, narrow) resolves a key by its hash. The
-- runtime (aioi_app) is granted EXECUTE only. Returns the org + scopes + revocation for the given hash.

CREATE OR REPLACE FUNCTION app_find_api_key(p_hash text)
  RETURNS TABLE(id uuid, organization_id uuid, scopes text[], revoked_at timestamp)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT a.id, a."organizationId", a.scopes, a."revokedAt"
  FROM "ApiKey" a
  WHERE a."hashedKey" = p_hash;
$$;

REVOKE ALL ON FUNCTION app_find_api_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_find_api_key(text) TO aioi_app;
