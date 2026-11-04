import type { MemberStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type MemberSegmentFilter = {
  q?: string;
  branchId?: string;
  cellId?: string;
  fellowshipId?: string;
  status?: MemberStatus | string;
  tagId?: string;
  /** Only members with email / phone for channel */
  requireEmail?: boolean;
  requirePhone?: boolean;
  limit?: number;
};

export function buildMemberSegmentWhere(
  filter: MemberSegmentFilter,
): Prisma.MemberWhereInput {
  return {
    ...(filter.branchId ? { branchId: filter.branchId } : {}),
    ...(filter.status
      ? { status: filter.status as MemberStatus }
      : {}),
    ...(filter.q
      ? {
          OR: [
            { firstName: { contains: filter.q, mode: "insensitive" } },
            { lastName: { contains: filter.q, mode: "insensitive" } },
            { phone: { contains: filter.q } },
            { memberNumber: { contains: filter.q, mode: "insensitive" } },
            { email: { contains: filter.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filter.cellId
      ? {
          groups: {
            some: { kind: "Cell", cellId: filter.cellId, endedAt: null },
          },
        }
      : {}),
    ...(filter.fellowshipId
      ? {
          groups: {
            some: {
              kind: "Fellowship",
              fellowshipMinistryId: filter.fellowshipId,
              endedAt: null,
            },
          },
        }
      : {}),
    ...(filter.tagId
      ? { tags: { some: { tagId: filter.tagId } } }
      : {}),
    ...(filter.requireEmail ? { email: { not: null } } : {}),
    ...(filter.requirePhone ? { phone: { not: null } } : {}),
  };
}

export async function listMembersForSegment(filter: MemberSegmentFilter) {
  const limit = Math.min(500, Math.max(1, filter.limit ?? 200));
  const where = buildMemberSegmentWhere(filter);
  // Prisma `email: { not: null }` still returns empty strings — filter in app
  const members = await prisma.member.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      memberNumber: true,
      status: true,
      branchId: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: limit,
  });
  return members.filter((m) => {
    if (filter.requireEmail && !m.email?.trim()) return false;
    if (filter.requirePhone && !m.phone?.trim()) return false;
    return true;
  });
}

export async function countMembersForSegment(filter: MemberSegmentFilter) {
  return listMembersForSegment({ ...filter, limit: 500 }).then((m) => m.length);
}
