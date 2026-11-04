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

export type AuditBrowserFilters = {
  q?: string | null;
  entityType?: string | null;
  action?: string | null;
  actorId?: string | null;
  page?: number;
  pageSize?: number;
};

/** Admin audit log browser — filterable, paginated. */
export async function browseAuditLogs(filters: AuditBrowserFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 40));
  const q = filters.q?.trim() || "";

  const where: Prisma.AuditLogWhereInput = {
    AND: [
      filters.entityType ? { entityType: filters.entityType } : {},
      filters.action ? { action: { contains: filters.action, mode: "insensitive" } } : {},
      filters.actorId ? { actorId: filters.actorId } : {},
      q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } },
              { actor: { name: { contains: q, mode: "insensitive" } } },
              { actor: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [total, items, entityTypes] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
      take: 80,
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    entityTypes: entityTypes.map((e) => e.entityType),
  };
}
