import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addChartToLayout,
  addFieldToLayout,
  DEFAULT_BOARD_LAYOUT,
  parseReportLayout,
  safeParseReportLayout,
} from "@/lib/reporting/template";

describe("report template layout", () => {
  it("parses the default Board layout", () => {
    const layout = parseReportLayout(DEFAULT_BOARD_LAYOUT);
    assert.equal(layout.audience, "Both");
    assert.ok(layout.fields.length >= 3);
    assert.ok(layout.charts.length >= 1);
  });

  it("rejects invalid field sources", () => {
    const result = safeParseReportLayout({
      ...DEFAULT_BOARD_LAYOUT,
      fields: [{ id: "x", label: "Bad", source: "individual.giving" }],
    });
    assert.equal(result.success, false);
  });

  it("appends a field and chart for live Data Centre edit", () => {
    const withField = addFieldToLayout(DEFAULT_BOARD_LAYOUT, {
      label: "By branch",
      source: "byBranch",
    });
    assert.equal(withField.fields.at(-1)?.source, "byBranch");

    const withChart = addChartToLayout(withField, {
      title: "Outstanding by branch",
      type: "bar",
      metric: "outstanding",
      groupBy: "branch",
    });
    assert.equal(withChart.charts.at(-1)?.groupBy, "branch");
    assert.equal(withChart.charts.length, DEFAULT_BOARD_LAYOUT.charts.length + 1);
  });
});
