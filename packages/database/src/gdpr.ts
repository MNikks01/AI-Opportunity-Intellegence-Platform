/**
 * GDPR data-subject operations (B-023): export an org's data (portability) and hard-delete an org
 * (erasure — cascades to all tenant data). Export is org-scoped via `withOrgContext` (RLS returns only
 * this org's rows); delete is a direct Organization delete (no RLS on the root) that cascades.
 * Secrets (API-key hashes) are never included in the export.
 */
import { prisma } from "./client";
import { withOrgContext } from "./rls";

export function exportOrgData(orgId: string) {
  return withOrgContext(orgId, async (tx) => {
    const [
      organization,
      memberships,
      workspaces,
      watchlists,
      alerts,
      notifications,
      briefs,
      apiKeys,
      subscription,
      auditLogs,
    ] = await Promise.all([
      tx.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, slug: true, createdAt: true },
      }),
      tx.membership.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { email: true, name: true } } },
      }),
      tx.workspace.findMany(),
      tx.watchlist.findMany({ include: { items: true } }),
      tx.alert.findMany(),
      tx.notification.findMany(),
      tx.brief.findMany(),
      tx.apiKey.findMany({
        select: { id: true, name: true, scopes: true, createdAt: true, revokedAt: true },
      }), // no hashedKey
      tx.subscription.findFirst(),
      tx.auditLog.findMany(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      organization,
      memberships,
      workspaces,
      watchlists,
      alerts,
      notifications,
      briefs,
      apiKeys,
      subscription,
      auditLogs,
    };
  });
}

/** Right to erasure — hard-delete the org; FK cascades remove all tenant data. Irreversible. */
export async function deleteOrg(orgId: string): Promise<{ id: string }> {
  await prisma.organization.delete({ where: { id: orgId } });
  return { id: orgId };
}
