import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Role,
  canAccessFinance,
  canAccessReporting,
  canWriteFinance,
} from "@/lib/roles";

describe("RBAC individual-giving gate", () => {
  it("allows FinancialSecretary and Admin on HQ finance", () => {
    assert.equal(canAccessFinance(Role.FinancialSecretary), true);
    assert.equal(canAccessFinance(Role.Admin), true);
    assert.equal(canWriteFinance(Role.FinancialSecretary), true);
    assert.equal(canWriteFinance(Role.Admin), true);
  });

  it("denies Board/Council/Clerk/Branch on HQ finance (aggregates via /reports)", () => {
    assert.equal(canAccessFinance(Role.PastoralBoard), false);
    assert.equal(canAccessFinance(Role.LeadershipCouncil), false);
    assert.equal(canAccessFinance(Role.RecordsClerk), false);
    assert.equal(canAccessFinance(Role.BranchLeader), false);
    assert.equal(canWriteFinance(Role.PastoralBoard), false);
  });

  it("still allows Board/Council reporting aggregates", () => {
    assert.equal(canAccessReporting(Role.PastoralBoard), true);
    assert.equal(canAccessReporting(Role.LeadershipCouncil), true);
    assert.equal(canAccessReporting(Role.RecordsClerk), false);
  });
});
