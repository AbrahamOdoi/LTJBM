import type { ObligationKind, Prisma } from "@prisma/client";
import { roundMoney, sumMoney, toMoneyNumber } from "@/lib/finance/money";

export type BalanceTriplet = {
  expected: number;
  paid: number;
  outstanding: number;
};

/**
 * Authoritative Expected / Paid / Outstanding for one obligation.
 * Outstanding = expected − paid (negative means overpayment).
 * Special Project overall target is informational; balances use expectedAmount.
 */
export function computeObligationBalances(input: {
  expectedAmount: Prisma.Decimal | number | string;
  payments: Array<{ amount: Prisma.Decimal | number | string }>;
}): BalanceTriplet {
  const expected = toMoneyNumber(input.expectedAmount);
  const paid = sumMoney(input.payments.map((p) => p.amount));
  const outstanding = roundMoney(expected - paid);
  return { expected, paid, outstanding };
}

export type ObligationWithPayments = {
  id: string;
  expectedAmount: Prisma.Decimal | number | string;
  projectTargetAmount?: Prisma.Decimal | number | string | null;
  instalmentCount?: number | null;
  obligationType: { kind: ObligationKind; name: string; code: string };
  payments: Array<{ amount: Prisma.Decimal | number | string }>;
};

export function withBalances<T extends ObligationWithPayments>(
  obligation: T,
): T & { balances: BalanceTriplet } {
  return {
    ...obligation,
    balances: computeObligationBalances({
      expectedAmount: obligation.expectedAmount,
      payments: obligation.payments,
    }),
  };
}

export type KindRollup = BalanceTriplet & {
  kind: ObligationKind;
  obligationCount: number;
};

/** Aggregate Expected / Paid / Outstanding by obligation kind (Reporting consume). */
export function rollupByKind(
  obligations: ObligationWithPayments[],
): KindRollup[] {
  const map = new Map<
    ObligationKind,
    { expected: number; paid: number; count: number }
  >();

  for (const ob of obligations) {
    const bal = computeObligationBalances(ob);
    const kind = ob.obligationType.kind;
    const prev = map.get(kind) ?? { expected: 0, paid: 0, count: 0 };
    map.set(kind, {
      expected: roundMoney(prev.expected + bal.expected),
      paid: roundMoney(prev.paid + bal.paid),
      count: prev.count + 1,
    });
  }

  const kinds: ObligationKind[] = [
    "Pledge",
    "Tithe",
    "Dues",
    "SpecialProject",
    "Thanksgiving",
  ];

  return kinds.map((kind) => {
    const row = map.get(kind) ?? { expected: 0, paid: 0, count: 0 };
    return {
      kind,
      obligationCount: row.count,
      expected: row.expected,
      paid: row.paid,
      outstanding: roundMoney(row.expected - row.paid),
    };
  });
}

export function isInArrears(balances: BalanceTriplet): boolean {
  return balances.outstanding > 0;
}
