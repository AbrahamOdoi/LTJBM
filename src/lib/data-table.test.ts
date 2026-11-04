import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchParams,
  hrefWithParams,
  pageResult,
  parsePageParams,
  DEFAULT_PAGE_SIZE,
} from "./data-table";

describe("parsePageParams", () => {
  it("defaults to page 1 and size 25", () => {
    const p = parsePageParams({});
    assert.equal(p.page, 1);
    assert.equal(p.pageSize, DEFAULT_PAGE_SIZE);
    assert.equal(p.skip, 0);
    assert.equal(p.take, DEFAULT_PAGE_SIZE);
  });

  it("clamps pageSize to max 100", () => {
    const p = parsePageParams({ page: "2", pageSize: "500" });
    assert.equal(p.page, 2);
    assert.equal(p.pageSize, 100);
    assert.equal(p.skip, 100);
  });
});

describe("buildSearchParams", () => {
  it("omits empty values and default page/pageSize", () => {
    const qs = buildSearchParams({
      q: "ama",
      branchId: "",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      status: "Active",
    });
    assert.equal(qs, "q=ama&status=Active");
  });

  it("keeps non-default page", () => {
    const href = hrefWithParams(
      "/members",
      { q: "ama", page: 1 },
      { page: 3 },
    );
    assert.equal(href, "/members?q=ama&page=3");
  });
});

describe("pageResult", () => {
  it("computes pageCount", () => {
    const r = pageResult([1, 2], 52, 1, 25);
    assert.equal(r.pageCount, 3);
    assert.equal(r.total, 52);
  });
});
