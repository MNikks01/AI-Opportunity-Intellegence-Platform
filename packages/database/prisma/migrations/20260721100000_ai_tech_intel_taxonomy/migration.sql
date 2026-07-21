-- AI & Technology Intelligence vertical — M1 taxonomy + per-article enrichment (ADR-0009).
-- Additive and lock-safe: new enum, new tables, and nullable columns only. Hand-written (not
-- `migrate dev`) because the auto-diff would try to drop `Trend.embedding` / `Trend.searchVector`,
-- the pgvector + FTS columns that are managed in raw SQL and intentionally absent from schema.prisma
-- (see the schema header and the add_trend_embedding / add_trend_search migrations).

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('US', 'CHINA', 'INDIA', 'EUROPE', 'JAPAN', 'SOUTH_KOREA', 'SINGAPORE', 'CANADA', 'AUSTRALIA', 'OTHER');

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "region" "Region",
ADD COLUMN     "defaultCategoryKey" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalCategory" (
    "signalId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SignalCategory_pkey" PRIMARY KEY ("signalId","categoryId")
);

-- CreateTable
CREATE TABLE "SignalAnalysis" (
    "signalId" UUID NOT NULL,
    "region" "Region" NOT NULL,
    "language" TEXT NOT NULL,
    "tldr" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "impactScore" SMALLINT NOT NULL,
    "opportunityScore" SMALLINT NOT NULL,
    "credibilityScore" SMALLINT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignalAnalysis_pkey" PRIMARY KEY ("signalId")
);

-- CreateTable
CREATE TABLE "ModelCard" (
    "entityId" UUID NOT NULL,
    "license" TEXT,
    "paramsB" DOUBLE PRECISION,
    "benchmarks" JSONB,
    "ggufAvailable" BOOLEAN NOT NULL DEFAULT false,
    "ollamaTag" TEXT,
    "mlxAvailable" BOOLEAN NOT NULL DEFAULT false,
    "vllmSupported" BOOLEAN NOT NULL DEFAULT false,
    "transformers" BOOLEAN NOT NULL DEFAULT false,
    "weightsUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelCard_pkey" PRIMARY KEY ("entityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_key_key" ON "Category"("key");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "SignalCategory_categoryId_idx" ON "SignalCategory"("categoryId");

-- CreateIndex
CREATE INDEX "SignalAnalysis_region_impactScore_idx" ON "SignalAnalysis"("region", "impactScore");

-- CreateIndex
CREATE INDEX "SignalAnalysis_opportunityScore_idx" ON "SignalAnalysis"("opportunityScore");

-- CreateIndex
CREATE INDEX "SignalAnalysis_contentHash_idx" ON "SignalAnalysis"("contentHash");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalCategory" ADD CONSTRAINT "SignalCategory_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalCategory" ADD CONSTRAINT "SignalCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalAnalysis" ADD CONSTRAINT "SignalAnalysis_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCard" ADD CONSTRAINT "ModelCard_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
