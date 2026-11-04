import { prisma } from "@/lib/db";
import {
  getScopedBranchIds,
  memberBranchWhere,
  type SessionUserLike,
} from "@/lib/members/access";

export async function listBranchesForUser(user: SessionUserLike) {
  const scoped = await getScopedBranchIds(user);
  return prisma.branch.findMany({
    where: scoped === null ? undefined : { id: { in: scoped } },
    orderBy: [{ isHq: "desc" }, { name: "asc" }],
  });
}

export async function listFellowships() {
  return prisma.fellowshipMinistry.findMany({ orderBy: { name: "asc" } });
}

export async function listCellsForBranches(branchIds: string[] | null) {
  return prisma.cell.findMany({
    where: branchIds === null ? undefined : { branchId: { in: branchIds } },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    include: { branch: { select: { id: true, name: true, code: true } } },
  });
}

export async function listMembers(opts: {
  user: SessionUserLike;
  q?: string;
  branchId?: string;
  cellId?: string;
  fellowshipId?: string;
  status?: string;
  take?: number;
}) {
  const scoped = await getScopedBranchIds(opts.user);
  const where = {
    ...memberBranchWhere(scoped),
    ...(opts.branchId ? { branchId: opts.branchId } : {}),
    ...(opts.status
      ? { status: opts.status as "Active" | "Inactive" | "Transferred" | "Deceased" | "Suspended" }
      : {}),
    ...(opts.q
      ? {
          OR: [
            { firstName: { contains: opts.q, mode: "insensitive" as const } },
            { lastName: { contains: opts.q, mode: "insensitive" as const } },
            { phone: { contains: opts.q } },
            { memberNumber: { contains: opts.q, mode: "insensitive" as const } },
            { email: { contains: opts.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(opts.cellId
      ? {
          groups: {
            some: { kind: "Cell" as const, cellId: opts.cellId, endedAt: null },
          },
        }
      : {}),
    ...(opts.fellowshipId
      ? {
          groups: {
            some: {
              kind: "Fellowship" as const,
              fellowshipMinistryId: opts.fellowshipId,
              endedAt: null,
            },
          },
        }
      : {}),
  };

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: opts.take ?? 200,
      include: {
        branch: { select: { id: true, name: true, code: true, isInternational: true, country: true } },
        groups: {
          where: { endedAt: null },
          include: {
            cell: true,
            fellowshipMinistry: true,
          },
        },
        households: {
          include: { household: true },
        },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return { members, total };
}

export async function getMemberDetail(user: SessionUserLike, memberId: string) {
  const scoped = await getScopedBranchIds(user);
  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      ...memberBranchWhere(scoped),
    },
    include: {
      branch: true,
      groups: {
        where: { endedAt: null },
        include: { cell: true, fellowshipMinistry: true },
      },
      households: {
        include: {
          household: {
            include: {
              members: {
                include: {
                  member: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      memberNumber: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: {
          fromBranch: { select: { id: true, name: true, code: true, country: true } },
          toBranch: { select: { id: true, name: true, code: true, country: true } },
          changedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  return member;
}

export async function listPendingDuplicates(user: SessionUserLike) {
  const scoped = await getScopedBranchIds(user);
  return prisma.duplicateCandidate.findMany({
    where: {
      status: "Pending",
      ...(scoped === null
        ? {}
        : {
            OR: [
              { memberA: { branchId: { in: scoped } } },
              { memberB: { branchId: { in: scoped } } },
            ],
          }),
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    include: {
      memberA: {
        include: { branch: { select: { name: true, code: true } } },
      },
      memberB: {
        include: { branch: { select: { name: true, code: true } } },
      },
    },
  });
}

export async function nextMemberNumber(branchCode: string) {
  const year = new Date().getFullYear();
  const prefix = `${branchCode}-${year}-`;
  const latest = await prisma.member.findFirst({
    where: { memberNumber: { startsWith: prefix } },
    orderBy: { memberNumber: "desc" },
    select: { memberNumber: true },
  });
  const seq = latest?.memberNumber
    ? Number(latest.memberNumber.slice(prefix.length)) + 1
    : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
