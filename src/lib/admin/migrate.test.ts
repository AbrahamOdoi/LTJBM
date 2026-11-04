import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCsv,
  suggestMapping,
  memberImportTemplateCsv,
} from "@/lib/admin/migrate-csv";

describe("member CSV migration helpers", () => {
  it("parses quoted CSV with commas", () => {
    const text = `firstName,lastName,addressLine1\n"Ama","Mensah","12 Ring Road, Accra"\n`;
    const parsed = parseCsv(text);
    assert.deepEqual(parsed.headers, [
      "firstName",
      "lastName",
      "addressLine1",
    ]);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].addressLine1, "12 Ring Road, Accra");
  });

  it("suggests mapping from export-style headers", () => {
    const headers = [
      "memberNumber",
      "firstName",
      "lastName",
      "branchCode",
      "phone",
    ];
    const mapping = suggestMapping(headers);
    assert.equal(mapping.firstName, "firstName");
    assert.equal(mapping.branchCode, "branchCode");
    assert.equal(mapping.phone, "phone");
  });

  it("suggests mapping from friendly spreadsheet headers", () => {
    const mapping = suggestMapping([
      "First Name",
      "Surname",
      "Branch",
      "Mobile",
    ]);
    assert.equal(mapping.firstName, "First Name");
    assert.equal(mapping.lastName, "Surname");
    assert.equal(mapping.branchCode, "Branch");
    assert.equal(mapping.phone, "Mobile");
  });

  it("ships a non-empty import template", () => {
    const csv = memberImportTemplateCsv();
    assert.match(csv, /firstName/);
    assert.match(csv, /branchCode/);
    assert.ok(csv.split("\n").length >= 2);
  });
});
