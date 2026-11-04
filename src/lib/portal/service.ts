import { prisma } from "@/lib/db";
import {
  getMemberContributionStatement,
  parseStatementPeriod,
} from "@/lib/finance/statements";

export async function getPortalProfile(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    include: {
      branch: { select: { name: true, code: true, country: true } },
      households: {
        include: { household: true },
        take: 1,
      },
      groups: {
        where: { endedAt: null },
        include: {
          cell: true,
          fellowshipMinistry: true,
        },
      },
    },
  });
}

export async function updatePortalProfile(
  memberId: string,
  input: {
    phone?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    region?: string | null;
  },
) {
  return prisma.member.update({
    where: { id: memberId },
    data: {
      phone: input.phone,
      email: input.email,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      region: input.region,
    },
  });
}

export async function getPortalStatement(
  memberId: string,
  from?: string | null,
  to?: string | null,
) {
  return getMemberContributionStatement(
    memberId,
    parseStatementPeriod(from, to),
  );
}
