"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CHART_GROUP_BY,
  CHART_METRICS,
  CHART_TYPES,
  FIELD_SOURCES,
  type ReportLayout,
} from "@/lib/reporting/template";

export function TemplateEditor({
  templateId,
  initialLayout,
}: {
  templateId: string;
  initialLayout: ReportLayout;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState(initialLayout);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [fieldLabel, setFieldLabel] = useState("Obligation count");
  const [fieldSource, setFieldSource] = useState<string>("totals.obligationCount");
  const [chartTitle, setChartTitle] = useState("Outstanding by kind");
  const [chartType, setChartType] = useState<string>("bar");
  const [chartMetric, setChartMetric] = useState<string>("outstanding");
  const [chartGroupBy, setChartGroupBy] = useState<string>("kind");

  function patch(body: Record<string, unknown>) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const res = await fetch(`/api/reports/templates/${templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          error?: string;
          template?: { layout: ReportLayout };
        };
        if (!res.ok) throw new Error(json.error ?? `Save failed (${res.status})`);
        if (json.template) setLayout(json.template.layout);
        setMessage("Template saved — Board dashboard will use the new layout.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Live report template
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Admin / Data Centre can add a field or chart. Board and Council
          dashboards read this layout on the next refresh.
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            patch({
              addField: { label: fieldLabel, source: fieldSource },
            });
          }}
        >
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Add field
          </h3>
          <label className="block text-sm">
            <span className="text-slate-600">Label</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Source</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={fieldSource}
              onChange={(e) => setFieldSource(e.target.value)}
            >
              {FIELD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Add field
          </button>
        </form>

        <form
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            patch({
              addChart: {
                title: chartTitle,
                type: chartType,
                metric: chartMetric,
                groupBy: chartGroupBy,
              },
            });
          }}
        >
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Add chart
          </h3>
          <label className="block text-sm">
            <span className="text-slate-600">Title</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              required
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-sm">
              <span className="text-slate-600">Type</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
              >
                {CHART_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Metric</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value)}
              >
                {CHART_METRICS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Group by</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
                value={chartGroupBy}
                onChange={(e) => setChartGroupBy(e.target.value)}
              >
                {CHART_GROUP_BY.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Add chart
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Current layout
        </h3>
        <div>
          <p className="text-sm font-medium text-slate-800">{layout.title}</p>
          <p className="text-xs text-slate-500">Audience: {layout.audience}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="mb-2 font-medium text-slate-700">Fields</p>
            <ul className="space-y-1 text-slate-600">
              {layout.fields.map((f) => (
                <li key={f.id}>
                  {f.label}{" "}
                  <code className="rounded bg-slate-100 px-1 text-xs">{f.source}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-slate-700">Charts</p>
            <ul className="space-y-1 text-slate-600">
              {layout.charts.map((c) => (
                <li key={c.id}>
                  {c.title}{" "}
                  <span className="text-xs text-slate-400">
                    ({c.type} · {c.metric} · {c.groupBy})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
