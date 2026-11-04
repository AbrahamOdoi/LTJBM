import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeObligationBalances,
  rollupByKind,
} from "@/lib/finance/balances";
import { computeBatchTotals } from "@/lib/finance/batches";

describe("computeObligationBalances", () => {
  it("tracks expected / paid / outstanding after two payments", () => {
    const bal = computeObligationBalances({
      expectedAmount: 1200,
      payments: [{ amount: 400 }, { amount: 400 }],
    });
    assert.equal(bal.expected, 1200);
    assert.equal(bal.paid, 800);
    assert.equal(bal.outstanding, 400);
  });

  it("allows overpayment (negative outstanding)", () => {
    const bal = computeObligationBalances({
      expectedAmount: 100,
      payments: [{ amount: 150 }],
    });
    assert.equal(bal.outstanding, -50);
  });
});

describe("computeBatchTotals", () => {
  it("flags variance when counted ≠ system", () => {
    const totals = computeBatchTotals({
      countedTotal: 500,
      payments: [{ amount: 200 }, { amount: 250 }],
    });
    assert.equal(totals.systemTotal, 450);
    assert.equal(totals.varianceAmount, 50);
    assert.equal(totals.hasVariance, true);
  });

  it("clears variance when totals match", () => {
    const totals = computeBatchTotals({
      countedTotal: 300,
      payments: [{ amount: 100 }, { amount: 200 }],
    });
    assert.equal(totals.varianceAmount, 0);
    assert.equal(totals.hasVariance, false);
  });
});

describe("rollupByKind", () => {
  it("aggregates Expected / Paid / Outstanding for Reporting", () => {
    const rows = rollupByKind([
      {
        id: "1",
        expectedAmount: 1000,
        obligationType: { kind: "Pledge", name: "Pledge", code: "PLEDGE" },
        payments: [{ amount: 400 }, { amount: 400 }],
      },
      {
        id: "2",
        expectedAmount: 50,
        obligationType: { kind: "Dues", name: "Dues", code: "DUES" },
        payments: [{ amount: 0 }],
      },
      {
        id: "3",
        expectedAmount: 200,
        projectTargetAmount: 5000,
        obligationType: {
          kind: "SpecialProject",
          name: "Special Project",
          code: "SPECIAL_PROJECT",
        },
        payments: [{ amount: 100 }, { amount: 50 }],
      },
    ]);

    const pledge = rows.find((r) => r.kind === "Pledge")!;
    assert.equal(pledge.expected, 1000);
    assert.equal(pledge.paid, 800);
    assert.equal(pledge.outstanding, 200);

    const dues = rows.find((r) => r.kind === "Dues")!;
    assert.equal(dues.outstanding, 50);

    const special = rows.find((r) => r.kind === "SpecialProject")!;
    assert.equal(special.expected, 200);
    assert.equal(special.paid, 150);
    assert.equal(special.outstanding, 50);
  });
});
