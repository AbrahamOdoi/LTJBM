import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/gl/expense-form";
import { MoneyCell } from "@/components/finance/money-cell";
import { requireFinanceAccess } from "@/lib/auth-guards";
import { toMoneyNumber } from "@/lib/finance/money";
import {
  ensureDefaultChart,
  listExpenses,
  listGlAccounts,
} from "@/lib/gl/service";
import { canWriteFinance } from "@/lib/roles";

export default async function ExpensesPage() {
  const session = await requireFinanceAccess().catch(() => null);
  if (!session) redirect("/login");

  await ensureDefaultChart();
  const writeOk = canWriteFinance(session.user.role);
  const [accounts, expenses] = await Promise.all([
    listGlAccounts({ activeOnly: true }),
    listExpenses({ page: 1, pageSize: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Expenses
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          Simplified HQ expense posting against the chart of accounts. Never
          available to branch treasurers. Expense lists show vendors and
          accounts — not contribution givers.
        </p>
      </div>

      {writeOk ? (
        <ExpenseForm
          expenseAccounts={accounts
            .filter((a) => a.type === "Expense")
            .map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))}
          assetAccounts={accounts
            .filter((a) => a.type === "Asset")
            .map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))}
        />
      ) : null}

      <div className="lt-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[var(--lt-muted)]"
                >
                  No expenses posted yet.
                </td>
              </tr>
            ) : (
              expenses.items.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 tabular-nums">
                    {e.expenseDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="px-4 py-3">
                    {e.account.code} {e.account.name}
                  </td>
                  <td className="px-4 py-3">{e.vendor ?? "—"}</td>
                  <td className="px-4 py-3">
                    <MoneyCell value={toMoneyNumber(e.amount)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
