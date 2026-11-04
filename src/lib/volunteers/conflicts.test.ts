import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirror of overlap helper used by volunteer conflict detection. */
function rangesOverlap(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date | null,
): boolean {
  const aE = aEnd ?? new Date(aStart.getTime() + 3 * 3600000);
  const bE = bEnd ?? new Date(bStart.getTime() + 3 * 3600000);
  return aStart < bE && bStart < aE;
}

describe("volunteer schedule overlap", () => {
  it("detects overlapping Sunday morning services", () => {
    const a0 = new Date("2026-11-08T09:00:00.000Z");
    const a1 = new Date("2026-11-08T11:30:00.000Z");
    const b0 = new Date("2026-11-08T10:00:00.000Z");
    const b1 = new Date("2026-11-08T12:00:00.000Z");
    assert.equal(rangesOverlap(a0, a1, b0, b1), true);
  });

  it("allows back-to-back non-overlapping slots", () => {
    const a0 = new Date("2026-11-08T09:00:00.000Z");
    const a1 = new Date("2026-11-08T11:00:00.000Z");
    const b0 = new Date("2026-11-08T11:00:00.000Z");
    const b1 = new Date("2026-11-08T13:00:00.000Z");
    assert.equal(rangesOverlap(a0, a1, b0, b1), false);
  });

  it("uses three-hour default when end is missing", () => {
    const a0 = new Date("2026-11-08T09:00:00.000Z");
    const b0 = new Date("2026-11-08T11:00:00.000Z");
    assert.equal(rangesOverlap(a0, null, b0, null), true);
    const later = new Date("2026-11-08T13:00:00.000Z");
    assert.equal(rangesOverlap(a0, null, later, null), false);
  });
});
