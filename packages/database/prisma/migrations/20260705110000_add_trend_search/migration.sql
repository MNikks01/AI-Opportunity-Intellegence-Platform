-- Keyword full-text search over trends (B-019). A STORED generated tsvector (title weighted above
-- summary) keeps the index maintenance automatic; a GIN index makes `@@` queries fast. Trend is a
-- global (non-tenant) table, so this search is public.

ALTER TABLE "Trend"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) STORED;

CREATE INDEX "Trend_searchVector_idx" ON "Trend" USING GIN ("searchVector");
