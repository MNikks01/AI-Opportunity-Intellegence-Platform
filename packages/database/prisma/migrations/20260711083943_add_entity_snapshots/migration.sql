-- CreateTable
CREATE TABLE "EntitySnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityId" UUID NOT NULL,
    "linkedTrendCount" INTEGER NOT NULL,
    "signalWeight" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntitySnapshot_entityId_capturedAt_idx" ON "EntitySnapshot"("entityId", "capturedAt");

-- AddForeignKey
ALTER TABLE "EntitySnapshot" ADD CONSTRAINT "EntitySnapshot_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
