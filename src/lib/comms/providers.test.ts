import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listProviderStatuses } from "@/lib/comms/providers";

describe("comms provider adapters", () => {
  it("reports credentials absent without claiming delivery", () => {
    const statuses = listProviderStatuses();
    assert.equal(statuses.length, 4);
    for (const s of statuses) {
      if (!s.configured) {
        assert.match(s.reason, /absent|stub|not configured/i);
      }
    }
    const email = statuses.find((s) => s.channel === "Email");
    assert.ok(email);
    assert.equal(email!.configured, false);
  });
});
