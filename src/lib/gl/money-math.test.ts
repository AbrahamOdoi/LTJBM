import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateJournalLines,
  varianceBudgetActual,
} from "@/lib/gl/money-math";

describe("validateJournalLines", () => {
  it("accepts a balanced two-line expense", () => {
    const result = validateJournalLines([
      { accountId: "exp", debit: 150, credit: 0 },
      { accountId: "cash", debit: 0, credit: 150 },
    ]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.totalDebit, 150);
      assert.equal(result.totalCredit, 150);
    }
  });

  it("rejects out-of-balance journals", () => {
    const result = validateJournalLines([
      { accountId: "exp", debit: 100, credit: 0 },
      { accountId: "cash", debit: 0, credit: 90 },
    ]);
    assert.equal(result.ok, false);
  });

  it("rejects dual-sided lines", () => {
    const result = validateJournalLines([
      { accountId: "a", debit: 50, credit: 50 },
      { accountId: "b", debit: 0, credit: 0 },
    ]);
    assert.equal(result.ok, false);
  });
});

describe("varianceBudgetActual", () => {
  it("computes budget minus actual", () => {
    assert.equal(varianceBudgetActual(1000, 750), 250);
    assert.equal(varianceBudgetActual(100, 120), -20);
  });
});
