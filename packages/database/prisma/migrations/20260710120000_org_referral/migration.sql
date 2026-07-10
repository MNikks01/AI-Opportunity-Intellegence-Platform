-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "Organization" ADD COLUMN "referredByCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_referralCode_key" ON "Organization"("referralCode");
CREATE INDEX "Organization_referredByCode_idx" ON "Organization"("referredByCode");
