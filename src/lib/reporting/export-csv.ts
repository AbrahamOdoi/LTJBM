import type { ReportColumn, ReportRow } from "@/lib/reporting/standard-reports";

/** Escape a CSV cell (RFC-style quotes). */
export function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const raw = String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function rowsToCsv(columns: ReportColumn[], rows: ReportRow[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => csvEscape(row[c.key])).join(","),
  );
  return [header, ...body].join("\n");
}
