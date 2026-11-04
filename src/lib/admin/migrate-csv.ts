/** Canonical target fields for spreadsheet → member register mapping. */
export const MIGRATE_TARGET_FIELDS = [
  { key: "memberNumber", label: "Member number", required: false },
  { key: "firstName", label: "First name", required: true },
  { key: "lastName", label: "Last name", required: true },
  { key: "otherNames", label: "Other names", required: false },
  { key: "dateOfBirth", label: "Date of birth (YYYY-MM-DD)", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "addressLine1", label: "Address line 1", required: false },
  { key: "addressLine2", label: "Address line 2", required: false },
  { key: "city", label: "City", required: false },
  { key: "region", label: "Region", required: false },
  { key: "country", label: "Country", required: false },
  { key: "status", label: "Status", required: false },
  { key: "branchCode", label: "Branch code", required: true },
  { key: "cellName", label: "Cell name", required: false },
  { key: "fellowshipName", label: "Fellowship / ministry", required: false },
  { key: "householdName", label: "Household name", required: false },
  { key: "joinedAt", label: "Joined date (YYYY-MM-DD)", required: false },
  { key: "baptismDate", label: "Baptism date (YYYY-MM-DD)", required: false },
  { key: "confirmationDate", label: "Confirmation date (YYYY-MM-DD)", required: false },
] as const;

export type MigrateTargetKey = (typeof MIGRATE_TARGET_FIELDS)[number]["key"];

export type ColumnMapping = Partial<Record<MigrateTargetKey, string>>;

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Sample CSV matching export headers — for Admin download. */
export function memberImportTemplateCsv(): string {
  const headers = [
    "memberNumber",
    "firstName",
    "lastName",
    "otherNames",
    "dateOfBirth",
    "gender",
    "phone",
    "email",
    "addressLine1",
    "city",
    "region",
    "country",
    "status",
    "branchCode",
    "cellName",
    "fellowshipName",
    "householdName",
    "joinedAt",
  ];
  const sample = [
    "",
    "Ama",
    "Mensah",
    "",
    "1990-05-12",
    "Female",
    "+233200000001",
    "ama@example.com",
    "12 Ring Road",
    "Accra",
    "Greater Accra",
    "Ghana",
    "Active",
    "HQ",
    "",
    "",
    "Mensah Household",
    "2020-01-15",
  ];
  return `${headers.join(",")}\n${sample.map(csvEscape).join(",")}\n`;
}

/** Parse a simple RFC4180-ish CSV (quoted fields, commas, newlines). */
export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.every((c) => c.trim() === "")) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    field += ch;
  }
  pushField();
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
    pushRow();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    return obj;
  });

  return { headers, rows: dataRows };
}

/** Guess mapping from common spreadsheet header names. */
export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h) => ({
    raw: h,
    n: h.toLowerCase().replace(/[\s_\-]+/g, ""),
  }));

  const aliases: Record<MigrateTargetKey, string[]> = {
    memberNumber: ["membernumber", "memberno", "membershipno", "id", "memberid"],
    firstName: ["firstname", "first", "givenname"],
    lastName: ["lastname", "last", "surname", "familyname"],
    otherNames: ["othernames", "middlename", "middle", "othername"],
    dateOfBirth: ["dateofbirth", "dob", "birthdate", "birthday"],
    gender: ["gender", "sex"],
    phone: ["phone", "mobile", "tel", "telephone", "phonenumber"],
    email: ["email", "emailaddress", "mail"],
    addressLine1: ["addressline1", "address", "address1", "street"],
    addressLine2: ["addressline2", "address2"],
    city: ["city", "town"],
    region: ["region", "state", "province"],
    country: ["country"],
    status: ["status", "memberstatus"],
    branchCode: ["branchcode", "branch", "unit", "unitcode"],
    cellName: ["cellname", "cell", "cellgroup"],
    fellowshipName: ["fellowshipname", "fellowship", "ministry"],
    householdName: ["householdname", "household", "family"],
    joinedAt: ["joinedat", "joined", "joindate", "membersincedate"],
    baptismDate: ["baptismdate", "baptism", "baptised"],
    confirmationDate: ["confirmationdate", "confirmation", "confirmed"],
  };

  for (const field of MIGRATE_TARGET_FIELDS) {
    const exact = headers.find((h) => h === field.key);
    if (exact) {
      mapping[field.key] = exact;
      continue;
    }
    const hit = normalized.find((h) => aliases[field.key].includes(h.n));
    if (hit) mapping[field.key] = hit.raw;
  }

  return mapping;
}
