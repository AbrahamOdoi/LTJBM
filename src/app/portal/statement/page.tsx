import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PrintButton } from "@/components/print-button";
import { requirePortalAccess } from "@/lib/auth-guards";
import { getPortalStatement } from "@/lib/portal/service";

function money(n: number) {
  return n.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type SearchParams = Promise<{ from?: string; to?: string }>;

export default async function PortalStatementPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePortalAccess().catch(() => null);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const from = sp.from ?? `${new Date().getUTCFullYear()}-01-01`;
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  const statement = await getPortalStatement(session.user.memberId!, from, to);
  if (!statement) redirect("/portal");

  return (
    <AppShell
      title="My contribution statement"
      subtitle="Your giving only — Head Office ledger underneath."
      role={session.user.role}
      userName={session.user.name}
      active="portal"
      subNav={[
        { href: "/portal", label: "My profile" },
        { href: "/portal/statement", label: "My statement" },
        { href: "/portal/sermons", label: "Sermons" },
        { href: "/give", label: "Give online" },
      ]}
    >
      <form
        method="get"
        className="lt-panel mb-4 flex flex-wrap gap-3 p-4 print:hidden"
      >
        <label className="text-sm">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="ml-2 rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          To
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="ml-2 rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <button type="submit" className="lt-btn-primary">
          Refresh
        </button>
        <PrintButton />
        <Link href="/portal" className="lt-btn-secondary">
          Back to profile
        </Link>
      </form>

      <section className="lt-panel space-y-4 p-6">
        <div className="flex flex-wrap justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-semibold">
              {statement.member.firstName} {statement.member.lastName}
            </h2>
            <p className="text-sm text-[var(--lt-muted)]">
              {statement.member.memberNumber ?? "—"} · {statement.member.branch.name}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="text-[var(--lt-muted)]">
              {from} → {to}
            </div>
            <div className="text-lg font-semibold">
              GH₵ {money(statement.periodTotal)}
            </div>
          </div>
        </div>

        {statement.lines.length === 0 ? (
          <p className="text-sm text-[var(--lt-muted)]">No payments in this period.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-[var(--lt-muted)]">
              <tr>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Kind</th>
                <th className="py-2 font-medium">Ref</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {statement.lines.map((l, i) => (
                <tr key={`${l.receiptHint}-${i}`} className="border-t border-slate-100">
                  <td className="py-2">{l.paidAt.toISOString().slice(0, 10)}</td>
                  <td className="py-2">{l.kind}</td>
                  <td className="py-2">{l.receiptHint}</td>
                  <td className="py-2 text-right">GH₵ {money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
