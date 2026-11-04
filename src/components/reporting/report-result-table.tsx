"use client";

import { useMemo } from "react";
import type { ReportColumn, ReportRow } from "@/lib/reporting/standard-reports";
import { rowsToCsv } from "@/lib/reporting/export-csv";

export function ReportResultTable({
  title,
  summary,
  columns,
  rows,
  generatedAt,
}: {
  title: string;
  summary?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  generatedAt?: string;
}) {
  const csv = useMemo(() => rowsToCsv(columns, rows), [columns, rows]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\w]+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:block">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--lt-ink)]">
            {title}
          </h2>
          {summary ? (
            <p className="mt-1 text-sm text-[var(--lt-muted)]">{summary}</p>
          ) : null}
          {generatedAt ? (
            <p className="mt-1 text-xs text-[var(--lt-muted)]">
              Generated{" "}
              <time dateTime={generatedAt}>
                {new Date(generatedAt).toLocaleString()}
              </time>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" className="lt-btn-secondary" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="lt-btn-primary" onClick={downloadCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="lt-table-wrap">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f9fafb] text-left text-[var(--lt-muted)]">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-[var(--lt-muted)]"
                >
                  No rows for these filters.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="border-t border-[var(--lt-line)]/70">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 tabular-nums">
                      {row[col.key] == null || row[col.key] === ""
                        ? "—"
                        : String(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
