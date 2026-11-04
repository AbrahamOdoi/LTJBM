import type { ObligationKind } from "@prisma/client";
import {
  computeObligationBalances,
  type KindRollup,
} from "@/lib/finance/balances";
import { getBalanceRollup } from "@/lib/finance/service";
import { roundMoney, toMoneyNumber } from "@/lib/finance/money";
import { prisma } from "@/lib/db";

export type BranchRollup = {
  branchId: string;
  branchName: string;
  branchCode: string;
  expected: number;
  paid: number;
  outstanding: number;
  obligationCount: number;
};

export type PeriodRollup = {
  periodKey: string;
  periodStart: string;
  expected: number;
  paid: number;
  outstanding: number;
  obligationCount: number;
};

export type DashboardSnapshot = {
  generatedAt: string;
  source: "live-db";
  financeContract: "GET /api/finance/balances";
  byKind: KindRollup[];
  byBranch: BranchRollup[];
  byPeriod: PeriodRollup[];
  totals: {
    expected: number;
    paid: number;
    outstanding: number;
    obligationCount: number;
  };
};

/**
 * Live Expected / Paid / Outstanding for Board/Council dashboards.
 * Reads Finance rollup contract + extra branch/period aggregates (read-only).
 * Does not post payments — Finance owns the write path.
 */
export async function getDashboardSnapshot(filters?: {
  periodStart?: Date;
  periodEnd?: Date;
  kind?: ObligationKind;
}): Promise<DashboardSnapshot> {
  const rollup = await getBalanceRollup({
    kind: filters?.kind,
    periodStart: filters?.periodStart,
    periodEnd: filters?.periodEnd,
  });

  const obligations = await prisma.obligation.findMany({
    where: {
      obligationType: filters?.kind ? { kind: filters.kind } : undefined,
      ...(filters?.periodStart || filters?.periodEnd
        ? {
            periodStart: {
              ...(filters.periodStart ? { gte: filters.periodStart } : {}),
              ...(filters.periodEnd ? { lte: filters.periodEnd } : {}),
            },
          }
        : {}),
    },
    include: {
      obligationType: true,
      payments: true,
      member: {
        select: {
          branchId: true,
          branch: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  const branchMap = new Map<
    string,
    {
      branchId: string;
      branchName: string;
      branchCode: string;
      expected: number;
      paid: number;
      count: number;
    }
  >();
  const periodMap = new Map<
    string,
    { periodStart: Date; expected: number; paid: number; count: number }
  >();

  for (const ob of obligations) {
    const bal = computeObligationBalances(ob);
    const branch = ob.member.branch;
    const bPrev = branchMap.get(branch.id) ?? {
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      expected: 0,
      paid: 0,
      count: 0,
    };
    branchMap.set(branch.id, {
      ...bPrev,
      expected: roundMoney(bPrev.expected + bal.expected),
      paid: roundMoney(bPrev.paid + bal.paid),
      count: bPrev.count + 1,
    });

    const periodKey = ob.periodStart.toISOString().slice(0, 10);
    const pPrev = periodMap.get(periodKey) ?? {
      periodStart: ob.periodStart,
      expected: 0,
      paid: 0,
      count: 0,
    };
    periodMap.set(periodKey, {
      periodStart: pPrev.periodStart,
      expected: roundMoney(pPrev.expected + bal.expected),
      paid: roundMoney(pPrev.paid + bal.paid),
      count: pPrev.count + 1,
    });
  }

  const byBranch: BranchRollup[] = [...branchMap.values()]
    .map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      branchCode: row.branchCode,
      expected: row.expected,
      paid: row.paid,
      outstanding: roundMoney(row.expected - row.paid),
      obligationCount: row.count,
    }))
    .sort((a, b) => a.branchName.localeCompare(b.branchName));

  const byPeriod: PeriodRollup[] = [...periodMap.entries()]
    .map(([periodKey, row]) => ({
      periodKey,
      periodStart: row.periodStart.toISOString(),
      expected: row.expected,
      paid: row.paid,
      outstanding: roundMoney(row.expected - row.paid),
      obligationCount: row.count,
    }))
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));

  return {
    generatedAt: new Date().toISOString(),
    source: "live-db",
    financeContract: "GET /api/finance/balances",
    byKind: rollup.byKind,
    byBranch,
    byPeriod,
    totals: {
      expected: toMoneyNumber(rollup.totals.expected),
      paid: toMoneyNumber(rollup.totals.paid),
      outstanding: toMoneyNumber(rollup.totals.outstanding),
      obligationCount: rollup.totals.obligationCount,
    },
  };
}
