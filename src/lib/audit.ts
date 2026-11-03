import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AuditWriteInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Append-only audit log helper for Platform and domain workstreams.
 * Prefer calling inside the same transaction as the domain write when possible.
 */
export async function writeAuditLog(
  input: AuditWriteInput,
  client: DbClient = prisma,
) {
  return client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function listRecentAuditLogs(limit = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
}
