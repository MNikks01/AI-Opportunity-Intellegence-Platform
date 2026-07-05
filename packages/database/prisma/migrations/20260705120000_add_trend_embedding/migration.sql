-- Semantic search over trends (B-019). A pgvector column + HNSW cosine index. Not expressible in PSL,
-- so raw SQL (see schema header). Dimension matches @aioi/ai-sdk EMBED_DIM (1536). Nullable: trends are
-- embedded on persist (backfill), and rows without an embedding are simply skipped by the search.

ALTER TABLE "Trend" ADD COLUMN embedding vector(1536);

CREATE INDEX "Trend_embedding_idx" ON "Trend" USING hnsw (embedding vector_cosine_ops);
