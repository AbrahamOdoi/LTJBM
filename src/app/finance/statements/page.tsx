import Link from "next/link";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireFinanceAccess } from "@/lib/auth-guards";
import { listFinanceMembers } from "@/lib/finance/service";
import {
  getMemberContributionStatement,
  parseStatementPeriod,
} from "@/lib/finance/statements";

function money(n: number) {
  return n.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type SearchParams = Promise<{
  memberId?: string;
  from?: string;
  to?: string;
}>;

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireFinanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const members = await listFinanceMembers();
  const memberId = sp.memberId ?? members[0]?.id ?? "";
  const from = sp.from ?? `${new Date().getUTCFullYear()}-01-01`;
  const to = sp.to ?? new Date().toISOString().slice(0, 10);

  const statement = memberId
    ? await getMemberContributionStatement(
        memberId,
        parseStatementPeriod(from, to),
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Contribution statements
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          Head Office print for one member&apos;s giving in a period. Pastoral Board
          never sees this surface — aggregates stay on Reports.
        </p>
      </div>

      <form
        method="get"
        className="lt-panel grid gap-3 p-4 print:hidden sm:grid-cols-4"
      >
        <label className="text-sm sm:col-span-2">
          Member
          <select
            name="memberId"
            defaultValue={memberId}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.lastName}, {m.firstName}
                {m.memberNumber ? ` (${m.memberNumber})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          To
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex items-end gap-2 sm:col-span-4">
          <button type="submit" className="lt-btn-primary">
            Load statement
          </button>
          <PrintButton />
        </div>
      </form>

      {statement ? (
        <section className="lt-panel space-y-4 p-6 print:border-0 print:shadow-none">
          <div className="flex flex-wrap justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--lt-muted)]">
                Living Testimonies · contribution statement
              </p>
              <h3 className="text-xl font-semibold">
                {statement.member.firstName} {statement.member.lastName}
              </h3>
              <p className="text-sm text-[var(--lt-muted)]">
                {statement.member.memberNumber ?? "No number"} ·{" "}
                {statement.member.branch.name}
              </p>
            </div>
            <div className="text-sm text-[var(--lt-muted)]">
              Period {from} → {to}
              <div className="mt-1 text-lg font-semibold text-[var(--lt-ink)]">
                Total GH₵ {money(statement.periodTotal)}
              </div>
            </div>
          </div>

          {statement.lines.length === 0 ? (
            <p className="text-sm text-[var(--lt-muted)]">
              No payments in this period.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-left text-[var(--lt-muted)]">
                <tr>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Kind</th>
                  <th className="py-2 font-medium">Method</th>
                  <th className="py-2 font-medium">Ref</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {statement.lines.map((l, i) => (
                  <tr key={`${l.receiptHint}-${i}`} className="border-t border-slate-100">
                    <td className="py-2">{l.paidAt.toISOString().slice(0, 10)}</td>
                    <td className="py-2">
                      {l.kind}
                      <div className="text-xs text-[var(--lt-muted)]">
                        {l.obligationName}
                      </div>
                    </td>
                    <td className="py-2">{l.method ?? "—"}</td>
                    <td className="py-2">{l.receiptHint}</td>
                    <td className="py-2 text-right">GH₵ {money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-medium">Obligation balances</h4>
            <ul className="mt-2 space-y-1 text-sm">
              {statement.obligationSummaries.map((o) => (
                <li key={o.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {o.kind} · {o.name}
                  </span>
                  <span className="text-[var(--lt-muted)]">
                    Exp {money(o.expected)} · Paid {money(o.paid)} · Out{" "}
                    {money(o.outstanding)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-[var(--lt-muted)] print:mt-8">
            HQ Finance only. Not for Board distribution lists.
          </p>
        </section>
      ) : (
        <p className="text-sm text-[var(--lt-muted)]">
          Select a member to load a statement.{" "}
          <Link href="/finance/obligations" className="lt-link">
            View obligations
          </Link>
        </p>
      )}
    </div>
  );
}
