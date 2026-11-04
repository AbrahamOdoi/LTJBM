import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Role,
  canAccessFinance,
  canAccessFinanceAggregateReports,
  canAccessFinanceDetailReports,
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

  it("denies Board/Council/Clerk/Branch/Member on HQ finance (aggregates via /reports)", () => {
    assert.equal(canAccessFinance(Role.PastoralBoard), false);
    assert.equal(canAccessFinance(Role.LeadershipCouncil), false);
    assert.equal(canAccessFinance(Role.RecordsClerk), false);
    assert.equal(canAccessFinance(Role.BranchLeader), false);
    assert.equal(canAccessFinance(Role.Member), false);
    assert.equal(canWriteFinance(Role.PastoralBoard), false);
  });

  it("opens Reports for Clerk/Branch (membership) and Board aggregates", () => {
    assert.equal(canAccessReporting(Role.PastoralBoard), true);
    assert.equal(canAccessReporting(Role.LeadershipCouncil), true);
    assert.equal(canAccessReporting(Role.RecordsClerk), true);
    assert.equal(canAccessReporting(Role.BranchLeader), true);
    assert.equal(canAccessFinanceAggregateReports(Role.RecordsClerk), false);
    assert.equal(canAccessFinanceAggregateReports(Role.PastoralBoard), true);
    assert.equal(canAccessFinanceDetailReports(Role.PastoralBoard), false);
    assert.equal(canAccessFinanceDetailReports(Role.FinancialSecretary), true);
  });
});
