-- CreateTable
CREATE TABLE "TrendSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trendId" UUID NOT NULL,
    "signalCount" INTEGER NOT NULL,
    "opportunity" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrendSnapshot_trendId_capturedAt_idx" ON "TrendSnapshot"("trendId", "capturedAt");

-- AddForeignKey
ALTER TABLE "TrendSnapshot" ADD CONSTRAINT "TrendSnapshot_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
