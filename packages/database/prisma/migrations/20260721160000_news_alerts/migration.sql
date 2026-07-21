-- News alerts (AI/tech vertical, M8). Additive:
--   1. a PUSH alert channel;
--   2. Telegram delivery config on OrgIntegration;
--   3. app_orgs_watching_topic() — cross-tenant discovery for region/category/model subscriptions,
--      mirroring app_orgs_watching_trend (WatchlistItem is RLS-protected; the runtime role connects as
--      the restricted user, so a SECURITY DEFINER lookup is the sanctioned bypass for this narrow read).
-- Hand-written (raw SQL) to keep it alongside the SQL function and stay lock-safe.

-- AlterEnum (PG16 allows ADD VALUE in a transaction; the value is unused within this migration).
ALTER TYPE "AlertChannel" ADD VALUE 'PUSH';

-- AlterTable
ALTER TABLE "OrgIntegration" ADD COLUMN     "telegramBotToken" TEXT,
ADD COLUMN     "telegramChatId" TEXT;

-- Cross-tenant discovery: "which orgs watch this topic?" (targetType = TOPIC, e.g. 'region:US',
-- 'category:ai-models', 'model:llama'). SECURITY DEFINER + pinned search_path, EXECUTE granted only to
-- the restricted runtime role.
CREATE OR REPLACE FUNCTION app_orgs_watching_topic(p_topic text)
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT DISTINCT w."organizationId"
  FROM "Watchlist" w
  JOIN "WatchlistItem" i ON i."watchlistId" = w.id
  WHERE i."targetType" = 'TOPIC' AND i."targetId" = p_topic;
$$;

REVOKE ALL ON FUNCTION app_orgs_watching_topic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_orgs_watching_topic(text) TO aioi_app;
