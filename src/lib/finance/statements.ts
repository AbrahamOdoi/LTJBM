import { prisma } from "@/lib/db";
import {
  computeObligationBalances,
  withBalances,
} from "@/lib/finance/balances";
import { toMoneyNumber } from "@/lib/finance/money";

export type StatementPeriod = {
  start: Date;
  end: Date;
};

export function parseStatementPeriod(
  from?: string | null,
  to?: string | null,
): StatementPeriod {
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const start = from
    ? new Date(`${from}T00:00:00.000Z`)
    : new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
  return { start, end };
}

/**
 * HQ member contribution statement — Financial Secretary / Admin only.
 * Never expose on Board aggregate surfaces.
 */
export async function getMemberContributionStatement(
  memberId: string,
  period: StatementPeriod,
) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  });
  if (!member) return null;

  const obligations = await prisma.obligation.findMany({
    where: { memberId },
    include: {
      obligationType: true,
      payments: {
        where: {
          paidAt: { gte: period.start, lte: period.end },
        },
        orderBy: { paidAt: "asc" },
      },
    },
    orderBy: { periodStart: "desc" },
  });

  const enriched = obligations.map((ob) => withBalances(ob));
  const lines = enriched.flatMap((ob) =>
    ob.payments.map((p) => ({
      paidAt: p.paidAt,
      amount: toMoneyNumber(p.amount),
      method: p.method,
      reference: p.reference,
      kind: ob.obligationType.kind,
      obligationName: ob.obligationType.name,
      receiptHint: p.reference || p.id.slice(-8).toUpperCase(),
    })),
  );
  lines.sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());

  const periodTotal = lines.reduce((sum, l) => sum + l.amount, 0);

  return {
    member,
    period,
    lines,
    periodTotal,
    obligationSummaries: enriched.map((o) => ({
      id: o.id,
      kind: o.obligationType.kind,
      name: o.obligationType.name,
      expected: o.balances.expected,
      paid: o.balances.paid,
      outstanding: o.balances.outstanding,
      target: o.projectTargetAmount
        ? toMoneyNumber(o.projectTargetAmount)
        : null,
    })),
  };
}

export async function listCampaignProjects() {
  const obligations = await prisma.obligation.findMany({
    where: {
      obligationType: { kind: "SpecialProject" },
    },
    include: {
      obligationType: true,
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
        },
      },
      payments: true,
      fellowshipMinistry: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return obligations.map((o) => {
    const bal = computeObligationBalances(o);
    const target = o.projectTargetAmount
      ? toMoneyNumber(o.projectTargetAmount)
      : bal.expected;
    return {
      id: o.id,
      name: o.obligationType.name,
      memberId: o.member.id,
      memberName: `${o.member.firstName} ${o.member.lastName}`,
      memberNumber: o.member.memberNumber,
      fellowship: o.fellowshipMinistry?.name ?? null,
      target,
      expected: bal.expected,
      paid: bal.paid,
      outstanding: bal.outstanding,
      periodStart: o.periodStart,
      periodEnd: o.periodEnd,
      notes: o.notes,
    };
  });
}
