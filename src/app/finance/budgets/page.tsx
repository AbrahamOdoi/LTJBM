import Link from "next/link";
import { redirect } from "next/navigation";
import { BudgetForm } from "@/components/gl/budget-form";
import { MoneyCell } from "@/components/finance/money-cell";
import { requireFinanceAccess } from "@/lib/auth-guards";
import {
  ensureDefaultChart,
  getBudgetVsActual,
  listBudgets,
  listGlAccounts,
} from "@/lib/gl/service";
import { canWriteFinance } from "@/lib/roles";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await requireFinanceAccess().catch(() => null);
  if (!session) redirect("/login");

  await ensureDefaultChart();
  const params = await searchParams;
  const writeOk = canWriteFinance(session.user.role);
  const [budgets, accounts] = await Promise.all([
    listBudgets(),
    listGlAccounts({ activeOnly: true }),
  ]);

  const selectedId = params.id || budgets[0]?.id;
  const vsActual = selectedId ? await getBudgetVsActual(selectedId) : null;

  const expenseAccounts = accounts
    .filter((a) => a.type === "Expense" || a.type === "Income")
    .map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Budgets vs actuals
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          Head Office budgets by account. Actuals come from posted journals —
          account totals only, never individual givers. Board aggregate report
          uses the same rule.
        </p>
      </div>

      {budgets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {budgets.map((b) => (
            <Link
              key={b.id}
              href={`/finance/budgets?id=${b.id}`}
              className={
                b.id === selectedId
                  ? "lt-btn-primary"
                  : "lt-btn-secondary"
              }
            >
              {b.name} ({b.fiscalYear})
            </Link>
          ))}
        </div>
      ) : null}

      {vsActual ? (
        <div className="lt-panel overflow-x-auto">
          <div className="border-b border-slate-100 px-4 py-3 text-sm">
            <span className="font-medium">{vsActual.budget.name}</span>
            <span className="text-[var(--lt-muted)]">
              {" "}
              · {vsActual.budget.periodStart.toISOString().slice(0, 10)} →{" "}
              {vsActual.budget.periodEnd.toISOString().slice(0, 10)}
            </span>
          </div>
          <table className="min-w-full text-sm">
            <thead className="text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Budget</th>
                <th className="px-4 py-3 font-medium">Actual</th>
                <th className="px-4 py-3 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {vsActual.rows.map((row) => (
                <tr key={row.accountId} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <span className="tabular-nums text-[var(--lt-muted)]">
                      {row.code}
                    </span>{" "}
                    {row.name}
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell value={row.budget} />
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell value={row.actual} />
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell
                      value={row.variance}
                      emphasize={row.variance < 0 ? "warn" : "muted"}
                    />
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 font-medium">
                <td className="px-4 py-3">Totals</td>
                <td className="px-4 py-3">
                  <MoneyCell value={vsActual.totals.budget} />
                </td>
                <td className="px-4 py-3">
                  <MoneyCell value={vsActual.totals.actual} />
                </td>
                <td className="px-4 py-3">
                  <MoneyCell value={vsActual.totals.variance} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No budgets yet. Create one below (HQ finance write roles).
        </p>
      )}

      {writeOk ? <BudgetForm accounts={expenseAccounts} /> : null}
    </div>
  );
}
