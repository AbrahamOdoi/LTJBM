"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReportResultTable } from "@/components/reporting/report-result-table";
import type {
  CustomDataset,
  CustomReportFilters,
} from "@/lib/reporting/custom-reports";
import type { ReportColumn, ReportRow } from "@/lib/reporting/standard-reports";

type ColumnOption = ReportColumn;

type Preview = {
  generatedAt: string;
  name: string;
  dataset: CustomDataset;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: string;
};

export function CustomReportBuilder({
  allowedDatasets,
  memberColumns,
  contributionColumns,
  saved,
}: {
  allowedDatasets: CustomDataset[];
  memberColumns: ColumnOption[];
  contributionColumns: ColumnOption[];
  saved?: {
    id: string;
    name: string;
    description: string | null;
    dataset: CustomDataset;
    filters: CustomReportFilters;
    columns: string[];
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(saved?.name ?? "");
  const [description, setDescription] = useState(saved?.description ?? "");
  const [dataset, setDataset] = useState<CustomDataset>(
    saved?.dataset ?? allowedDatasets[0] ?? "members",
  );
  const availableColumns =
    dataset === "members" ? memberColumns : contributionColumns;
  const [columns, setColumns] = useState<string[]>(
    saved?.columns ?? availableColumns.map((c) => c.key),
  );
  const [filters, setFilters] = useState<CustomReportFilters>(
    saved?.filters ?? {},
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const datasetOptions = useMemo(() => allowedDatasets, [allowedDatasets]);

  function toggleColumn(key: string) {
    setColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  function onDatasetChange(next: CustomDataset) {
    setDataset(next);
    const cols = next === "members" ? memberColumns : contributionColumns;
    setColumns(cols.map((c) => c.key));
    setPreview(null);
  }

  function runPreview() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/reports/custom/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name || "Untitled custom report",
            dataset,
            filters,
            columns,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Run failed");
        setPreview(body as Preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Run failed");
      }
    });
  }

  function saveReport() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/reports/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description || null,
            dataset,
            filters,
            columns,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Save failed");
        setMessage(`Saved “${body.name}” for your role.`);
        router.push(`/reports/builder/${body.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Custom report builder
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          Pick a dataset, choose columns and filters, then run or save a named
          report for your ministry role. This is a pragmatic builder — not a BI
          suite.
        </p>
      </div>

      <div className="lt-panel grid gap-4 p-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Report name</span>
          <input
            className="lt-input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Active members — Accra"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Description (optional)</span>
          <input
            className="lt-input mt-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Dataset</span>
          <select
            className="lt-input mt-1"
            value={dataset}
            onChange={(e) => onDatasetChange(e.target.value as CustomDataset)}
          >
            {datasetOptions.map((d) => (
              <option key={d} value={d}>
                {d === "members" ? "Members" : "Contributions"}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Search</span>
          <input
            className="lt-input mt-1"
            value={filters.q ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, q: e.target.value || undefined }))
            }
            placeholder="Name or member #"
          />
        </label>
        {dataset === "members" ? (
          <label className="block text-sm">
            <span className="text-[var(--lt-muted)]">Status</span>
            <select
              className="lt-input mt-1"
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value || undefined,
                }))
              }
            >
              <option value="">Any</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Transferred">Transferred</option>
              <option value="Suspended">Suspended</option>
              <option value="Deceased">Deceased</option>
            </select>
          </label>
        ) : (
          <label className="block text-sm">
            <span className="text-[var(--lt-muted)]">Contribution kind</span>
            <select
              className="lt-input mt-1"
              value={filters.kind ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  kind: e.target.value || undefined,
                }))
              }
            >
              <option value="">Any</option>
              <option value="Pledge">Pledge</option>
              <option value="Tithe">Tithe</option>
              <option value="Dues">Dues</option>
              <option value="SpecialProject">Special Project</option>
              <option value="Thanksgiving">Thanksgiving</option>
            </select>
          </label>
        )}
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">From date</span>
          <input
            type="date"
            className="lt-input mt-1"
            value={filters.periodStart ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                periodStart: e.target.value || undefined,
              }))
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">To date</span>
          <input
            type="date"
            className="lt-input mt-1"
            value={filters.periodEnd ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                periodEnd: e.target.value || undefined,
              }))
            }
          />
        </label>
      </div>

      <fieldset className="lt-panel space-y-3 p-4">
        <legend className="px-1 text-sm font-medium text-[var(--lt-ink)]">
          Columns
        </legend>
        <div className="flex flex-wrap gap-3">
          {availableColumns.map((col) => (
            <label key={col.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={columns.includes(col.key)}
                onChange={() => toggleColumn(col.key)}
              />
              {col.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="lt-btn-primary disabled:opacity-60"
          disabled={pending || columns.length === 0}
          onClick={runPreview}
        >
          Run report
        </button>
        <button
          type="button"
          className="lt-btn-secondary disabled:opacity-60"
          disabled={pending || name.trim().length < 2 || columns.length === 0}
          onClick={saveReport}
        >
          Save for my role
        </button>
      </div>

      {message ? (
        <p className="text-sm text-[var(--lt-ok)]">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-[color-mix(in_srgb,var(--lt-warn)_40%,var(--lt-line))] bg-[color-mix(in_srgb,var(--lt-warn)_12%,white)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {preview ? (
        <ReportResultTable
          title={preview.name}
          summary={preview.summary}
          columns={preview.columns}
          rows={preview.rows}
          generatedAt={preview.generatedAt}
        />
      ) : null}
    </div>
  );
}
