/**
 * Audit log (B-022). Every mutating/privileged action writes an entry (see the tRPC audit middleware).
 * Org-scoped via `withOrgContext` (AuditLog has direct-org RLS). `actorUserId` is a real user uuid or
 * null (e.g. API-key/dev principals record their identity in `metadata` instead).
 */
import type { Prisma } from "@prisma/client";
import { withOrgContext } from "./rls";

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export function writeAuditLog(orgId: string, entry: AuditEntry) {
  return withOrgContext(orgId, (tx) =>
    tx.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ...(entry.metadata ? { metadata: entry.metadata as Prisma.InputJsonValue } : {}),
      },
    }),
  );
}

export function listAuditLogs(orgId: string, limit = 50) {
  return withOrgContext(orgId, (tx) =>
    tx.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
  );
}
