"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  commitMigrateAction,
  dryRunMigrateAction,
  parseMigrateCsvAction,
} from "@/lib/admin/migrate-actions";
import {
  MIGRATE_TARGET_FIELDS,
  type ColumnMapping,
  type MigrateTargetKey,
} from "@/lib/admin/migrate-csv";

type Step = "upload" | "map" | "dry-run" | "done";

export function MigrateWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<Awaited<
    ReturnType<typeof dryRunMigrateAction>
  > | null>(null);
  const [commitSummary, setCommitSummary] = useState<{
    created: number;
    skipped: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const mappedTargets = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping],
  );

  function onFile(file: File | null) {
    setError(null);
    setDryRun(null);
    setCommitSummary(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      setFileName(file.name);
      startTransition(async () => {
        const parsed = await parseMigrateCsvAction(text);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }
        setHeaders(parsed.headers);
        setRowCount(parsed.rowCount);
        setSampleRows(parsed.sampleRows);
        setMapping(parsed.suggestedMapping);
        setStep("map");
      });
    };
    reader.readAsText(file);
  }

  function setFieldMapping(field: MigrateTargetKey, column: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (!column) {
        delete next[field];
      } else {
        next[field] = column;
      }
      return next;
    });
  }

  function runDryRun() {
    setError(null);
    startTransition(async () => {
      const result = await dryRunMigrateAction(csvText, mapping);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDryRun(result);
      setStep("dry-run");
    });
  }

  function runCommit() {
    setError(null);
    startTransition(async () => {
      const result = await commitMigrateAction(csvText, mapping);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCommitSummary({ created: result.created, skipped: result.skipped });
      setStep("done");
    });
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-[var(--lt-muted)]">
        {(
          [
            ["upload", "1 · Upload"],
            ["map", "2 · Map columns"],
            ["dry-run", "3 · Dry-run"],
            ["done", "4 · Commit"],
          ] as const
        ).map(([id, label]) => (
          <li
            key={id}
            className={`rounded px-2.5 py-1 ${
              step === id
                ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                : "bg-[var(--lt-paper)]"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="text-sm text-[var(--lt-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {step === "upload" ? (
        <section className="lt-panel space-y-4 p-5">
          <p className="text-sm text-[var(--lt-muted)]">
            Upload a members CSV from an old register or spreadsheet. You will
            map columns, preview validation, then commit. Finance ledgers are
            never imported here.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="lt-btn-primary cursor-pointer px-4 py-2 text-sm">
              Choose CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <a
              href="/api/admin/migrate/template"
              className="inline-flex rounded-md border border-[var(--lt-line)] bg-white px-4 py-2 text-sm hover:bg-[var(--lt-paper)]"
            >
              Download template CSV
            </a>
          </div>
          {fileName ? (
            <p className="text-xs text-[var(--lt-muted)]">Selected: {fileName}</p>
          ) : null}
          {pending ? (
            <p className="text-sm text-[var(--lt-muted)]">Reading CSV…</p>
          ) : null}
        </section>
      ) : null}

      {step === "map" ? (
        <section className="lt-panel space-y-4 p-5">
          <p className="text-sm text-[var(--lt-muted)]">
            {rowCount} data row{rowCount === 1 ? "" : "s"} · {headers.length}{" "}
            columns. Required fields: first name, last name, branch code.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--lt-line)] text-xs uppercase tracking-wide text-[var(--lt-muted)]">
                  <th className="py-2 pr-4 font-medium">Register field</th>
                  <th className="py-2 font-medium">CSV column</th>
                </tr>
              </thead>
              <tbody>
                {MIGRATE_TARGET_FIELDS.map((field) => (
                  <tr key={field.key} className="border-b border-[var(--lt-line)]/70">
                    <td className="py-2 pr-4">
                      {field.label}
                      {field.required ? (
                        <span className="ml-1 text-[var(--lt-danger)]">*</span>
                      ) : null}
                    </td>
                    <td className="py-2">
                      <select
                        className="lt-input max-w-xs"
                        value={mapping[field.key] ?? ""}
                        onChange={(e) =>
                          setFieldMapping(field.key, e.target.value)
                        }
                      >
                        <option value="">— skip —</option>
                        {headers.map((h) => (
                          <option
                            key={h}
                            value={h}
                            disabled={
                              mappedTargets.has(h) && mapping[field.key] !== h
                            }
                          >
                            {h}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sampleRows.length > 0 ? (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--lt-muted)]">
                Sample rows
              </h3>
              <pre className="mt-2 max-h-40 overflow-auto rounded border border-[var(--lt-line)] bg-[var(--lt-paper)] p-3 text-xs">
                {JSON.stringify(sampleRows, null, 2)}
              </pre>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md border border-[var(--lt-line)] bg-white px-4 py-2 text-sm"
              onClick={() => {
                setStep("upload");
                setDryRun(null);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="lt-btn-primary px-4 py-2 text-sm"
              disabled={pending}
              onClick={runDryRun}
            >
              {pending ? "Validating…" : "Run dry-run"}
            </button>
          </div>
        </section>
      ) : null}

      {step === "dry-run" && dryRun && dryRun.ok ? (
        <section className="lt-panel space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Rows", value: dryRun.total },
              { label: "Valid", value: dryRun.valid },
              { label: "Errors", value: dryRun.errorCount },
              { label: "Warnings", value: dryRun.warningCount },
            ].map((card) => (
              <div key={card.label} className="rounded border border-[var(--lt-line)] px-3 py-3">
                <p className="text-[0.7rem] uppercase tracking-[0.12em] text-[var(--lt-muted)]">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {dryRun.issues.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-auto text-sm">
              {dryRun.issues.map((issue, idx) => (
                <li
                  key={`${issue.row}-${idx}`}
                  className={
                    issue.level === "error"
                      ? "text-[var(--lt-danger)]"
                      : "text-[var(--lt-muted)]"
                  }
                >
                  Row {issue.row || "—"} · {issue.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--lt-muted)]">
              No issues — ready to commit.
            </p>
          )}

          {dryRun.preview.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--lt-line)] text-xs uppercase text-[var(--lt-muted)]">
                    <th className="py-2 pr-3">Row</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Branch</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRun.preview.map((row) => (
                    <tr key={row.row} className="border-b border-[var(--lt-line)]/60">
                      <td className="py-1.5 pr-3 tabular-nums">{row.row}</td>
                      <td className="py-1.5 pr-3">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="py-1.5 pr-3">{row.branchCode}</td>
                      <td className="py-1.5 pr-3">{row.status}</td>
                      <td className="py-1.5">{row.ok ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md border border-[var(--lt-line)] bg-white px-4 py-2 text-sm"
              onClick={() => setStep("map")}
            >
              Back to mapping
            </button>
            <button
              type="button"
              className="lt-btn-primary px-4 py-2 text-sm"
              disabled={pending || dryRun.errorCount > 0 || dryRun.valid === 0}
              onClick={runCommit}
            >
              {pending ? "Importing…" : "Commit import"}
            </button>
          </div>
          {dryRun.errorCount > 0 ? (
            <p className="text-xs text-[var(--lt-muted)]">
              Fix errors (or remap columns) before commit. Warnings alone do not
              block import.
            </p>
          ) : null}
        </section>
      ) : null}

      {step === "done" && commitSummary ? (
        <section className="lt-panel space-y-3 p-5">
          <h2 className="text-base font-medium text-[var(--lt-ink)]">
            Import complete
          </h2>
          <p className="text-sm text-[var(--lt-muted)]">
            Created <strong className="text-[var(--lt-ink)]">{commitSummary.created}</strong>{" "}
            members
            {commitSummary.skipped
              ? ` · skipped ${commitSummary.skipped}`
              : ""}
            . Open the member register to review.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/members" className="lt-btn-primary px-4 py-2 text-sm">
              Open member register
            </Link>
            <button
              type="button"
              className="rounded-md border border-[var(--lt-line)] bg-white px-4 py-2 text-sm"
              onClick={() => {
                setStep("upload");
                setCsvText("");
                setFileName(null);
                setDryRun(null);
                setCommitSummary(null);
                setMapping({});
              }}
            >
              Import another file
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
