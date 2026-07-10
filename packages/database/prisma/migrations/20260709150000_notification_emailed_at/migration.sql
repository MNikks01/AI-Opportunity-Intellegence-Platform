-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "emailedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_organizationId_emailedAt_idx" ON "Notification"("organizationId", "emailedAt");
