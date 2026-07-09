/**
 * Per-org outbound integrations (B-034): where the daily digest is delivered. RBAC-gated at the call
 * site; audited (we log which channels changed, never the webhook URLs themselves). OrgIntegration has
 * no RLS (id is the org), so this runs on the app connection directly.
 */
import { prisma } from "./client";
import { writeAuditLog } from "./audit";

export interface OrgIntegration {
  slackWebhookUrl: string | null;
  discordWebhookUrl: string | null;
  digestEnabled: boolean;
}

export async function getOrgIntegration(orgId: string): Promise<OrgIntegration | null> {
  return prisma.orgIntegration.findUnique({
    where: { organizationId: orgId },
    select: { slackWebhookUrl: true, discordWebhookUrl: true, digestEnabled: true },
  });
}

const clean = (v: string | null | undefined): string | null => {
  const s = (v ?? "").trim();
  return s || null;
};

/**
 * Upsert integration config. A field left `undefined` is unchanged; `null`/"" clears it. `digestEnabled`
 * defaults to true on first write.
 */
export async function setOrgIntegration(
  orgId: string,
  actorUserId: string | null,
  patch: {
    slackWebhookUrl?: string | null;
    discordWebhookUrl?: string | null;
    digestEnabled?: boolean;
  },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.slackWebhookUrl !== undefined) update.slackWebhookUrl = clean(patch.slackWebhookUrl);
  if (patch.discordWebhookUrl !== undefined)
    update.discordWebhookUrl = clean(patch.discordWebhookUrl);
  if (patch.digestEnabled !== undefined) update.digestEnabled = patch.digestEnabled;

  await prisma.orgIntegration.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      slackWebhookUrl: clean(patch.slackWebhookUrl),
      discordWebhookUrl: clean(patch.discordWebhookUrl),
      digestEnabled: patch.digestEnabled ?? true,
    },
    update,
  });

  await writeAuditLog(orgId, {
    actorUserId,
    action: "integration.update",
    metadata: {
      changed: Object.keys(update),
      slackSet:
        patch.slackWebhookUrl !== undefined ? Boolean(clean(patch.slackWebhookUrl)) : undefined,
      discordSet:
        patch.discordWebhookUrl !== undefined ? Boolean(clean(patch.discordWebhookUrl)) : undefined,
      digestEnabled: patch.digestEnabled,
    },
  });
}
