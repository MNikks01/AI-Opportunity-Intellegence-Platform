/**
 * First-sign-in bootstrap (B-015). Idempotently provisions a new user's tenant: a User row (mirrored
 * from Clerk), a personal Organization, an OWNER Membership, and a personal Workspace. Safe to call on
 * every sign-in — returns the existing tenant if the user already has one (`created: false`).
 *
 * Runs as the restricted runtime role (aioi_app): Organization/Membership/User have no RLS; the
 * Workspace insert is RLS-protected, so we set the org context (via set_config) inside the same
 * transaction before creating it (ADR-0002 D5, ADR-0003).
 */
import { randomUUID } from "node:crypto";
import type { $Enums } from "@prisma/client";
import { prisma } from "./client";

export interface BootstrapInput {
  clerkId: string;
  email: string;
  name?: string;
}

export interface BootstrapResult {
  userId: string;
  organizationId: string;
  workspaceId: string | null;
  role: $Enums.Role;
  created: boolean;
}

function slugify(seed: string): string {
  const base =
    seed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "org";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function bootstrapUser(input: BootstrapInput): Promise<BootstrapResult> {
  const { clerkId, email, name } = input;

  return prisma.$transaction(async (tx) => {
    // Mirror the Clerk user (id is a db-generated uuid; clerkId is the external key).
    const user = await tx.user.upsert({
      where: { clerkId },
      create: { clerkId, email, name },
      update: { email, name },
    });

    // Already onboarded? Return the existing tenant (idempotent).
    const existing = await tx.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      await tx.$executeRaw`SELECT set_config('app.current_org', ${existing.organizationId}, true)`;
      const ws = await tx.workspace.findFirst({ where: { kind: "PERSONAL" } });
      return {
        userId: user.id,
        organizationId: existing.organizationId,
        workspaceId: ws?.id ?? null,
        role: existing.role,
        created: false,
      };
    }

    const org = await tx.organization.create({
      data: { name: `${name ?? email.split("@")[0]}'s workspace`, slug: slugify(name ?? email) },
    });
    await tx.membership.create({
      data: { organizationId: org.id, userId: user.id, role: "OWNER" },
    });

    // Workspace is RLS-protected — set the org context before inserting (WITH CHECK).
    await tx.$executeRaw`SELECT set_config('app.current_org', ${org.id}, true)`;
    const ws = await tx.workspace.create({
      data: { organizationId: org.id, name: "Personal", kind: "PERSONAL" },
    });

    return {
      userId: user.id,
      organizationId: org.id,
      workspaceId: ws.id,
      role: "OWNER",
      created: true,
    };
  });
}
