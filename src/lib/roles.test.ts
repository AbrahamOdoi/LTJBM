import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Role,
  canAccessFinance,
  canAccessFinanceAggregateReports,
  canAccessFinanceDetailReports,
  canAccessGroups,
  canAccessMedia,
  canAccessReporting,
  canWriteFinance,
  canWriteGroups,
  canWriteMedia,
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

  it("opens Groups hub for Clerk/Branch/Admin/Board; write for Clerk/Branch/Admin only", () => {
    assert.equal(canAccessGroups(Role.RecordsClerk), true);
    assert.equal(canAccessGroups(Role.BranchLeader), true);
    assert.equal(canAccessGroups(Role.Admin), true);
    assert.equal(canAccessGroups(Role.PastoralBoard), true);
    assert.equal(canAccessGroups(Role.LeadershipCouncil), true);
    assert.equal(canAccessGroups(Role.FinancialSecretary), false);
    assert.equal(canAccessGroups(Role.Member), false);
    assert.equal(canWriteGroups(Role.RecordsClerk), true);
    assert.equal(canWriteGroups(Role.PastoralBoard), false);
    assert.equal(canWriteGroups(Role.LeadershipCouncil), false);
  });

  it("opens Sermon library for staff; write for Clerk/Branch/Admin/Board; portal Member uses /portal", () => {
    assert.equal(canAccessMedia(Role.RecordsClerk), true);
    assert.equal(canAccessMedia(Role.FinancialSecretary), true);
    assert.equal(canAccessMedia(Role.Member), false);
    assert.equal(canWriteMedia(Role.PastoralBoard), true);
    assert.equal(canWriteMedia(Role.FinancialSecretary), false);
    assert.equal(canWriteMedia(Role.LeadershipCouncil), false);
  });

  it("never lets Branch Leader post HQ finance / GL", () => {
    assert.equal(canAccessFinance(Role.BranchLeader), false);
    assert.equal(canWriteFinance(Role.BranchLeader), false);
  });
});
