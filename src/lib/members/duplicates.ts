import type { Member, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type DuplicateMatchInput = {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null;
  phone?: string | null;
  email?: string | null;
  excludeMemberId?: string;
};

export type DuplicateHit = {
  member: Pick<
    Member,
    | "id"
    | "memberNumber"
    | "firstName"
    | "lastName"
    | "otherNames"
    | "dateOfBirth"
    | "phone"
    | "email"
    | "branchId"
    | "status"
    | "photoKey"
  >;
  score: number;
  reasons: string[];
};

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameDay(a: Date | null | undefined, b: Date | null | undefined) {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Deterministic duplicate detection: phone, email, and name+DOB.
 * Photo similarity is out of scope for Phase A (flag hook reserved).
 */
export async function findDuplicateCandidates(
  input: DuplicateMatchInput,
): Promise<DuplicateHit[]> {
  const first = normalizeName(input.firstName);
  const last = normalizeName(input.lastName);
  const phone = normalizePhone(input.phone);
  const email = input.email?.trim().toLowerCase() || null;

  const orFilters: Prisma.MemberWhereInput[] = [];

  if (phone) {
    orFilters.push({ phone: { contains: phone.slice(-9) } });
  }
  if (email) {
    orFilters.push({ email: { equals: email, mode: "insensitive" } });
  }
  orFilters.push({
    AND: [
      { firstName: { equals: input.firstName.trim(), mode: "insensitive" } },
      { lastName: { equals: input.lastName.trim(), mode: "insensitive" } },
    ],
  });

  const candidates = await prisma.member.findMany({
    where: {
      AND: [
        input.excludeMemberId ? { id: { not: input.excludeMemberId } } : {},
        { OR: orFilters },
      ],
    },
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      lastName: true,
      otherNames: true,
      dateOfBirth: true,
      phone: true,
      email: true,
      branchId: true,
      status: true,
      photoKey: true,
    },
    take: 50,
  });

  const hits: DuplicateHit[] = [];

  for (const member of candidates) {
    const reasons: string[] = [];
    let score = 0;

    const memberPhone = normalizePhone(member.phone);
    if (phone && memberPhone && phone === memberPhone) {
      reasons.push("Exact phone match");
      score += 0.45;
    }

    const memberEmail = member.email?.trim().toLowerCase() || null;
    if (email && memberEmail && email === memberEmail) {
      reasons.push("Exact email match");
      score += 0.35;
    }

    const nameMatch =
      normalizeName(member.firstName) === first &&
      normalizeName(member.lastName) === last;
    if (nameMatch) {
      reasons.push("Exact name match");
      score += 0.2;
      if (sameDay(member.dateOfBirth, input.dateOfBirth ?? null)) {
        reasons.push("Name + date of birth match");
        score += 0.35;
      }
    }

    if (reasons.length === 0 || score < 0.35) continue;

    hits.push({
      member,
      score: Math.min(1, Number(score.toFixed(2))),
      reasons,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
}

export async function persistDuplicateCandidates(
  newMemberId: string,
  hits: DuplicateHit[],
) {
  for (const hit of hits) {
    const [memberAId, memberBId] =
      newMemberId < hit.member.id
        ? [newMemberId, hit.member.id]
        : [hit.member.id, newMemberId];

    await prisma.duplicateCandidate.upsert({
      where: {
        memberAId_memberBId: { memberAId, memberBId },
      },
      update: {
        score: hit.score,
        reasons: hit.reasons,
        status: "Pending",
      },
      create: {
        memberAId,
        memberBId,
        score: hit.score,
        reasons: hit.reasons,
      },
    });
  }
}
