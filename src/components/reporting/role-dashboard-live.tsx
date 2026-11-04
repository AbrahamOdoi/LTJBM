"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { KpiTile } from "@/components/reporting/kpi-tile";
import { SimpleBarChart } from "@/components/reporting/simple-bar-chart";
import { MoneyCell } from "@/components/finance/money-cell";
import { obligationKindLabel } from "@/lib/church-labels";
import type { RoleDashboardSnapshot } from "@/lib/reporting/role-dashboard";

type Payload = RoleDashboardSnapshot & {
  role: string;
  sections?: string[];
};

export function RoleDashboardLive({ initial }: { initial: Payload }) {
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
        const next = (await res.json()) as Payload;
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

  const showFinanceTables =
    data.finance &&
    (data.profile === "board" ||
      data.profile === "council" ||
      data.profile === "finance" ||
      data.profile === "admin");

  const showBranch = data.profile === "council" || data.profile === "admin";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            {data.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
            {data.subtitle}
            {" · "}
            Updated{" "}
            <time dateTime={data.generatedAt}>
              {new Date(data.generatedAt).toLocaleString()}
            </time>
            {pending ? " · refreshing…" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reports/library" className="lt-btn-secondary">
            Standard reports
          </Link>
          <Link href="/reports/builder" className="lt-btn-secondary">
            Custom report
          </Link>
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="lt-btn-primary disabled:opacity-60"
          >
            Refresh now
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-[color-mix(in_srgb,var(--lt-warn)_40%,var(--lt-line))] bg-[color-mix(in_srgb,var(--lt-warn)_12%,white)] px-3 py-2 text-sm text-[var(--lt-ink)]">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiTile
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            format={kpi.format}
            emphasize={kpi.emphasize}
          />
        ))}
      </section>

      {data.charts.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {data.charts.map((chart) => (
            <SimpleBarChart
              key={chart.id}
              title={chart.title}
              data={chart.data}
              format={chart.format}
            />
          ))}
        </section>
      ) : null}

      {showFinanceTables && data.finance ? (
        <section className="lt-table-wrap">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f9fafb] text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Obligations</th>
                <th className="px-4 py-3 font-medium">Expected</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {data.finance.byKind.map((row) => (
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
      ) : null}

      {showBranch && data.finance ? (
        <section className="space-y-2">
          <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--lt-muted)]">
            By branch
          </h3>
          <div className="lt-table-wrap">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f9fafb] text-left text-[var(--lt-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Expected</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data.finance.byBranch.map((row) => (
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

      {data.recentActivity.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--lt-muted)]">
            Recent activity
          </h3>
          <ul className="lt-panel divide-y divide-[var(--lt-line)]">
            {data.recentActivity.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--lt-ink)]">{item.label}</p>
                  {item.detail ? (
                    <p className="text-[var(--lt-muted)]">{item.detail}</p>
                  ) : null}
                </div>
                <time
                  className="text-xs text-[var(--lt-muted)]"
                  dateTime={item.at}
                >
                  {new Date(item.at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(data.profile === "board" || data.profile === "council") && (
        <p className="text-xs text-[var(--lt-muted)]">
          Individual giving is not shown here. Authorised Head Office roles use
          Contributions for member-level detail.
        </p>
      )}
      {data.profile === "membership" && (
        <p className="text-xs text-[var(--lt-muted)]">
          Contributions and Board finance totals stay closed for Records Clerks
          and Branch Leaders — Head Office only.
        </p>
      )}
    </div>
  );
}
