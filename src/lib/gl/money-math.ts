import { roundMoney, toMoneyNumber } from "@/lib/finance/money";

export type JournalLineDraft = {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string | null;
};

/** Validate double-entry balance (debits == credits, each line one-sided). */
export function validateJournalLines(lines: JournalLineDraft[]): {
  ok: true;
  totalDebit: number;
  totalCredit: number;
} | {
  ok: false;
  error: string;
} {
  if (lines.length < 2) {
    return { ok: false, error: "A journal entry needs at least two lines." };
  }
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    const debit = roundMoney(line.debit || 0);
    const credit = roundMoney(line.credit || 0);
    if (debit < 0 || credit < 0) {
      return { ok: false, error: "Debit and credit amounts cannot be negative." };
    }
    if (debit > 0 && credit > 0) {
      return {
        ok: false,
        error: "Each journal line must be either a debit or a credit, not both.",
      };
    }
    if (debit === 0 && credit === 0) {
      return { ok: false, error: "Journal lines cannot be zero on both sides." };
    }
    if (!line.accountId) {
      return { ok: false, error: "Each journal line needs an account." };
    }
    totalDebit = roundMoney(totalDebit + debit);
    totalCredit = roundMoney(totalCredit + credit);
  }
  if (totalDebit !== totalCredit) {
    return {
      ok: false,
      error: `Journal is out of balance (debit ${totalDebit.toFixed(2)} ≠ credit ${totalCredit.toFixed(2)}).`,
    };
  }
  if (totalDebit === 0) {
    return { ok: false, error: "Journal total cannot be zero." };
  }
  return { ok: true, totalDebit, totalCredit };
}

export function varianceBudgetActual(budget: number, actual: number): number {
  return roundMoney(toMoneyNumber(budget) - toMoneyNumber(actual));
}
