-- Signal search (AI/tech vertical, M5). Adds a pgvector embedding + a STORED FTS tsvector to Signal,
-- mirroring the Trend search columns (add_trend_embedding / add_trend_search). Raw SQL because neither
-- is expressible in PSL; both are intentionally absent from schema.prisma (see the schema header).
-- Additive + lock-safe: new nullable column + one generated column + their indexes. Dimension matches
-- @aioi/ai-sdk EMBED_DIM (1536). Embedding is nullable — signals are embedded by the reembed backfill,
-- and rows without one are simply skipped by semantic search.

ALTER TABLE "Signal" ADD COLUMN embedding vector(1536);

CREATE INDEX "Signal_embedding_idx" ON "Signal" USING hnsw (embedding vector_cosine_ops);

ALTER TABLE "Signal"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED;

CREATE INDEX "Signal_searchVector_idx" ON "Signal" USING GIN ("searchVector");
