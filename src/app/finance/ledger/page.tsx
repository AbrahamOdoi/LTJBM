import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountForm } from "@/components/gl/account-form";
import { JournalForm } from "@/components/gl/journal-form";
import { ReconcilePaymentForm } from "@/components/gl/reconcile-form";
import { MoneyCell } from "@/components/finance/money-cell";
import { requireFinanceAccess } from "@/lib/auth-guards";
import { toMoneyNumber } from "@/lib/finance/money";
import { prisma } from "@/lib/db";
import {
  ensureDefaultChart,
  listGlAccounts,
  listJournalEntries,
} from "@/lib/gl/service";
import { canWriteFinance } from "@/lib/roles";

function acctLabel(a: { code: string; name: string }) {
  return `${a.code} — ${a.name}`;
}

export default async function LedgerPage() {
  const session = await requireFinanceAccess().catch(() => null);
  if (!session) redirect("/login");

  await ensureDefaultChart();

  const writeOk = canWriteFinance(session.user.role);
  const [accounts, journals, unlinkedPayments] = await Promise.all([
    listGlAccounts({ activeOnly: true }),
    listJournalEntries({ page: 1, pageSize: 40 }),
    prisma.payment.findMany({
      where: { journalEntry: null },
      take: 20,
      orderBy: { paidAt: "desc" },
      include: {
        obligation: {
          include: {
            obligationType: true,
            member: { select: { firstName: true, lastName: true, memberNumber: true } },
          },
        },
      },
    }),
  ]);

  const accountOpts = accounts.map((a) => ({
    id: a.id,
    label: acctLabel(a),
  }));
  const incomeAccounts = accounts
    .filter((a) => a.type === "Income")
    .map((a) => ({ id: a.id, label: acctLabel(a) }));
  const cashAccounts = accounts
    .filter((a) => a.type === "Asset")
    .map((a) => ({ id: a.id, label: acctLabel(a) }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            General ledger
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
            Chart of accounts and journal entries at Head Office only. Branch
            treasurers cannot post. Board and Council never see individual
            givers — use Reports for aggregates.
          </p>
        </div>
        <Link
          href="/api/finance/gl/export"
          className="lt-btn-secondary"
        >
          Export posted CSV
        </Link>
      </div>

      <section className="lt-panel overflow-x-auto">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium">
          Chart of accounts
        </div>
        <table className="min-w-full text-sm">
          <thead className="text-left text-[var(--lt-muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2 tabular-nums">{a.code}</td>
                <td className="px-4 py-2">{a.name}</td>
                <td className="px-4 py-2">{a.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {writeOk ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AccountForm />
          <ReconcilePaymentForm
            payments={unlinkedPayments.map((p) => ({
              id: p.id,
              label: `${p.paidAt.toISOString().slice(0, 10)} · ${p.obligation.obligationType.code} · GH₵ ${toMoneyNumber(p.amount).toFixed(2)} · ${p.obligation.member.memberNumber ?? p.obligation.member.lastName}`,
            }))}
            incomeAccounts={incomeAccounts}
            cashAccounts={cashAccounts}
          />
        </div>
      ) : null}

      {writeOk ? <JournalForm accounts={accountOpts} /> : null}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--lt-ink)]">
          Recent journals
        </h3>
        {journals.items.length === 0 ? (
          <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
            No journal entries yet.
          </p>
        ) : (
          journals.items.map((j) => (
            <article key={j.id} className="lt-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium text-[var(--lt-ink)]">
                    {j.entryDate.toISOString().slice(0, 10)}
                  </span>
                  {j.reference ? (
                    <span className="text-[var(--lt-muted)]"> · {j.reference}</span>
                  ) : null}
                  {j.memo ? (
                    <span className="text-[var(--lt-muted)]"> — {j.memo}</span>
                  ) : null}
                </div>
                <span
                  className={
                    j.status === "Posted"
                      ? "text-[var(--lt-ok)]"
                      : "text-[var(--lt-muted)]"
                  }
                >
                  {j.status}
                </span>
              </div>
              <table className="mt-3 min-w-full text-sm">
                <tbody>
                  {j.lines.map((line) => (
                    <tr key={line.id} className="border-t border-slate-100">
                      <td className="py-1.5 pr-3">
                        {line.account.code} {line.account.name}
                      </td>
                      <td className="py-1.5 text-right">
                        {toMoneyNumber(line.debit) > 0 ? (
                          <MoneyCell value={toMoneyNumber(line.debit)} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 text-right">
                        {toMoneyNumber(line.credit) > 0 ? (
                          <MoneyCell value={toMoneyNumber(line.credit)} />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
