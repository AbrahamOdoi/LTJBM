import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Role } from "@/lib/roles";
import {
  canRunStandardReport,
  listStandardReportCatalog,
} from "@/lib/reporting/standard-reports";
import {
  canUseCustomDataset,
  columnsForDataset,
  parseSaveCustomReport,
} from "@/lib/reporting/custom-reports";
import { csvEscape, rowsToCsv } from "@/lib/reporting/export-csv";
import { dashboardProfileForRole } from "@/lib/roles";

describe("standard report catalog RBAC", () => {
  it("gives clerks membership reports only", () => {
    const catalog = listStandardReportCatalog(Role.RecordsClerk);
    assert.ok(catalog.some((r) => r.id === "membership-by-branch"));
    assert.ok(catalog.some((r) => r.id === "new-members-period"));
    assert.equal(
      catalog.some((r) => r.id === "dues-arrears"),
      false,
    );
    assert.equal(
      canRunStandardReport(Role.RecordsClerk, "board-expected-paid-outstanding"),
      false,
    );
  });

  it("gives Board aggregate board report but not dues arrears detail", () => {
    assert.equal(
      canRunStandardReport(Role.PastoralBoard, "board-expected-paid-outstanding"),
      true,
    );
    assert.equal(
      canRunStandardReport(Role.PastoralBoard, "board-budget-vs-actual"),
      true,
    );
    assert.equal(canRunStandardReport(Role.PastoralBoard, "dues-arrears"), false);
    assert.equal(
      canRunStandardReport(Role.PastoralBoard, "saturday-batch-variance"),
      false,
    );
  });

  it("gives Financial Secretary HQ detail reports", () => {
    assert.equal(canRunStandardReport(Role.FinancialSecretary, "dues-arrears"), true);
    assert.equal(
      canRunStandardReport(Role.FinancialSecretary, "saturday-batch-variance"),
      true,
    );
  });
});

describe("custom report builder MVP", () => {
  it("restricts contributions dataset to HQ finance roles", () => {
    assert.equal(canUseCustomDataset(Role.RecordsClerk, "members"), true);
    assert.equal(canUseCustomDataset(Role.RecordsClerk, "contributions"), false);
    assert.equal(canUseCustomDataset(Role.FinancialSecretary, "contributions"), true);
  });

  it("parses a named members report definition", () => {
    const parsed = parseSaveCustomReport({
      name: "Active Accra members",
      dataset: "members",
      filters: { status: "Active" },
      columns: ["firstName", "lastName", "branch", "status"],
    });
    assert.equal(parsed.dataset, "members");
    assert.equal(parsed.columns.length, 4);
  });

  it("exposes dataset columns", () => {
    assert.ok(columnsForDataset("members").some((c) => c.key === "branch"));
    assert.ok(
      columnsForDataset("contributions").some((c) => c.key === "outstanding"),
    );
  });
});

describe("csv export helper", () => {
  it("escapes commas and builds a header row", () => {
    assert.equal(csvEscape('a,b'), '"a,b"');
    const csv = rowsToCsv(
      [
        { key: "name", label: "Name" },
        { key: "count", label: "Count" },
      ],
      [{ name: "HQ, Accra", count: 12 }],
    );
    assert.equal(csv.split("\n")[0], "Name,Count");
    assert.ok(csv.includes('"HQ, Accra"'));
  });
});

describe("dashboard profiles", () => {
  it("maps each role to a landing profile", () => {
    assert.equal(dashboardProfileForRole(Role.RecordsClerk), "membership");
    assert.equal(dashboardProfileForRole(Role.BranchLeader), "membership");
    assert.equal(dashboardProfileForRole(Role.FinancialSecretary), "finance");
    assert.equal(dashboardProfileForRole(Role.PastoralBoard), "board");
    assert.equal(dashboardProfileForRole(Role.LeadershipCouncil), "council");
    assert.equal(dashboardProfileForRole(Role.Admin), "admin");
  });
});
