-- CreateTable
CREATE TABLE "OrgIntegration" (
    "organizationId" UUID NOT NULL,
    "slackWebhookUrl" TEXT,
    "discordWebhookUrl" TEXT,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgIntegration_pkey" PRIMARY KEY ("organizationId")
);

-- AddForeignKey
ALTER TABLE "OrgIntegration" ADD CONSTRAINT "OrgIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
