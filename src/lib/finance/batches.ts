import type { Prisma } from "@prisma/client";
import { roundMoney, sumMoney, toMoneyNumber } from "@/lib/finance/money";

export type BatchTotals = {
  countedTotal: number;
  systemTotal: number;
  varianceAmount: number;
  hasVariance: boolean;
};

/**
 * Saturday collection reconciliation:
 * systemTotal = sum of linked payment amounts
 * varianceAmount = countedTotal − systemTotal
 * hasVariance when absolute variance is ≥ 0.01
 */
export function computeBatchTotals(input: {
  countedTotal: Prisma.Decimal | number | string;
  payments: Array<{ amount: Prisma.Decimal | number | string }>;
}): BatchTotals {
  const countedTotal = toMoneyNumber(input.countedTotal);
  const systemTotal = sumMoney(input.payments.map((p) => p.amount));
  const varianceAmount = roundMoney(countedTotal - systemTotal);
  return {
    countedTotal,
    systemTotal,
    varianceAmount,
    hasVariance: Math.abs(varianceAmount) >= 0.01,
  };
}
