import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/roles";
import { AuthGuardError } from "@/lib/auth-guards";

export type SessionUserLike = {
  id: string;
  role: Role | string;
};

/**
 * Branch Leaders are limited to assigned branches.
 * RecordsClerk / Admin (and other HQ roles) see all branches for biodata.
 */
export async function getScopedBranchIds(
  user: SessionUserLike,
): Promise<string[] | null> {
  if (user.role !== Role.BranchLeader) {
    return null;
  }

  const scopes = await prisma.userBranchScope.findMany({
    where: { userId: user.id },
    select: { branchId: true },
  });

  return scopes.map((s) => s.branchId);
}

export function memberBranchWhere(
  branchIds: string[] | null,
): Prisma.MemberWhereInput {
  if (branchIds === null) return {};
  if (branchIds.length === 0) {
    return { branchId: { in: [] } };
  }
  return { branchId: { in: branchIds } };
}

export async function assertBranchWritable(
  user: SessionUserLike,
  branchId: string,
) {
  const scoped = await getScopedBranchIds(user);
  if (scoped === null) return;
  if (!scoped.includes(branchId)) {
    throw new AuthGuardError(
      "Branch Leaders may only manage members in their assigned branch.",
      403,
    );
  }
}

export async function assertMemberReadable(
  user: SessionUserLike,
  memberId: string,
) {
  const scoped = await getScopedBranchIds(user);
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, branchId: true },
  });
  if (!member) {
    throw new AuthGuardError("Member not found", 404);
  }
  if (scoped !== null && !scoped.includes(member.branchId)) {
    throw new AuthGuardError("Member is outside your branch scope", 403);
  }
  return member;
}
