"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { MoneyTile } from "@/components/reporting/money-tile";
import { SimpleBarChart } from "@/components/reporting/simple-bar-chart";
import { MoneyCell } from "@/components/finance/money-cell";
import { obligationKindLabel } from "@/lib/church-labels";
import type { ReportLayout } from "@/lib/reporting/template";

type KindRow = {
  kind: string;
  expected: number;
  paid: number;
  outstanding: number;
  obligationCount: number;
};

type BranchRow = {
  branchId: string;
  branchName: string;
  branchCode: string;
  expected: number;
  paid: number;
  outstanding: number;
  obligationCount: number;
};

type PeriodRow = {
  periodKey: string;
  expected: number;
  paid: number;
  outstanding: number;
  obligationCount: number;
};

type DashboardPayload = {
  view: "board" | "council" | "admin" | null;
  role: string;
  generatedAt: string;
  source: string;
  financeContract: string;
  sections: string[];
  totals: {
    expected: number;
    paid: number;
    outstanding: number;
    obligationCount: number;
  };
  byKind: KindRow[];
  byBranch: BranchRow[];
  byPeriod: PeriodRow[];
};

export function DashboardLive({
  initial,
  layout,
}: {
  initial: DashboardPayload;
  layout: ReportLayout;
}) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/reports/dashboard", { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Refresh failed (${res.status})`);
        }
        const next = (await res.json()) as DashboardPayload;
        setData(next);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refresh failed");
      }
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(refresh, 15_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const showBranch = data.sections.includes("byBranch");
  const showPeriod = data.sections.includes("byPeriod");

  const chartDataFor = (groupBy: string, metric: "expected" | "paid" | "outstanding") => {
    if (groupBy === "branch") {
      return data.byBranch.map((r) => ({ label: r.branchName, value: r[metric] }));
    }
    if (groupBy === "period") {
      return data.byPeriod.map((r) => ({ label: r.periodKey, value: r[metric] }));
    }
    return data.byKind.map((r) => ({
      label: obligationKindLabel(r.kind),
      value: r[metric],
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--lt-ink)]">
            {layout.title}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--lt-muted)]">
            Live Expected / Paid / Outstanding · last refresh{" "}
            <time dateTime={data.generatedAt}>
              {new Date(data.generatedAt).toLocaleString()}
            </time>
            {pending ? " · refreshing…" : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--lt-muted)]">
            {data.view === "board"
              ? "Pastoral Board view — aggregated totals only"
              : data.view === "council"
                ? "Leadership Council view (includes branch & period)"
                : "Full Data Centre / Financial Secretary view"}
            {" · "}
            figures update when contributions are posted — no manual rebuild
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="lt-btn-secondary disabled:opacity-60"
        >
          Refresh now
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-[color-mix(in_srgb,var(--lt-warn)_40%,var(--lt-line))] bg-[color-mix(in_srgb,var(--lt-warn)_12%,white)] px-3 py-2 text-sm text-[var(--lt-ink)]">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <MoneyTile label="Expected" value={data.totals.expected} />
        <MoneyTile label="Paid" value={data.totals.paid} emphasize="ok" />
        <MoneyTile
          label="Outstanding"
          value={data.totals.outstanding}
          emphasize={data.totals.outstanding > 0 ? "warn" : "ok"}
        />
      </section>

      <section className="lt-table-wrap">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f7f5] text-left text-[var(--lt-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Obligations</th>
              <th className="px-4 py-3 font-medium">Expected</th>
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {data.byKind.map((row) => (
              <tr key={row.kind} className="border-t border-[var(--lt-line)]/70">
                <td className="px-4 py-3 font-medium text-[var(--lt-ink)]">
                  {obligationKindLabel(row.kind)}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.obligationCount}</td>
                <td className="px-4 py-3">
                  <MoneyCell value={row.expected} />
                </td>
                <td className="px-4 py-3">
                  <MoneyCell value={row.paid} emphasize="ok" />
                </td>
                <td className="px-4 py-3">
                  <MoneyCell
                    value={row.outstanding}
                    emphasize={row.outstanding > 0 ? "warn" : "muted"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {layout.charts.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {layout.charts.map((chart) => (
            <SimpleBarChart
              key={chart.id}
              title={chart.title}
              data={chartDataFor(chart.groupBy, chart.metric)}
            />
          ))}
        </section>
      ) : null}

      {showBranch ? (
        <section className="space-y-2">
          <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--lt-muted)]">
            By branch (Leadership Council / Data Centre)
          </h3>
          <div className="lt-table-wrap">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f7f5] text-left text-[var(--lt-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Expected</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data.byBranch.map((row) => (
                  <tr
                    key={row.branchId}
                    className="border-t border-[var(--lt-line)]/70"
                  >
                    <td className="px-4 py-3">
                      {row.branchName}{" "}
                      <span className="text-[var(--lt-muted)]">
                        ({row.branchCode})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <MoneyCell value={row.expected} />
                    </td>
                    <td className="px-4 py-3">
                      <MoneyCell value={row.paid} emphasize="ok" />
                    </td>
                    <td className="px-4 py-3">
                      <MoneyCell
                        value={row.outstanding}
                        emphasize={row.outstanding > 0 ? "warn" : "muted"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {showPeriod ? (
        <section className="space-y-2">
          <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--lt-muted)]">
            By period start
          </h3>
          <div className="lt-table-wrap">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f7f5] text-left text-[var(--lt-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Expected</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data.byPeriod.map((row) => (
                  <tr
                    key={row.periodKey}
                    className="border-t border-[var(--lt-line)]/70"
                  >
                    <td className="px-4 py-3 tabular-nums">{row.periodKey}</td>
                    <td className="px-4 py-3">
                      <MoneyCell value={row.expected} />
                    </td>
                    <td className="px-4 py-3">
                      <MoneyCell value={row.paid} emphasize="ok" />
                    </td>
                    <td className="px-4 py-3">
                      <MoneyCell
                        value={row.outstanding}
                        emphasize={row.outstanding > 0 ? "warn" : "muted"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="text-xs text-[var(--lt-muted)]">
        Board reports show aggregated Expected / Paid / Outstanding only.
        Individual contribution detail stays under Contributions for authorised
        Head Office roles.
      </p>
    </div>
  );
}
