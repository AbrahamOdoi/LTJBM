import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listGivingProviders,
  resolveProvider,
} from "@/lib/giving/providers";

describe("giving providers", () => {
  it("always exposes Demo and lists Paystack/MoMo", () => {
    const providers = listGivingProviders();
    assert.ok(providers.some((p) => p.id === "Demo"));
    assert.ok(providers.some((p) => p.id === "Paystack"));
    assert.ok(providers.some((p) => p.id === "MoMo"));
  });

  it("falls back to Demo when live keys are absent", () => {
    assert.equal(resolveProvider("Paystack", "Card"), "Demo");
    assert.equal(resolveProvider("MoMo", "MoMo"), "Demo");
    assert.equal(resolveProvider(null, "Card"), "Demo");
  });

  it("keeps Demo when explicitly requested", () => {
    assert.equal(resolveProvider("Demo", "Bank"), "Demo");
  });
});
