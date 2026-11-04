import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFinanceAccess } from "@/lib/auth-guards";
import { listOnlineGivingForHq } from "@/lib/giving/service";
import { getGivingProviderStatuses } from "@/lib/giving/service";
import { toMoneyNumber } from "@/lib/finance/money";
import { canWriteFinance } from "@/lib/roles";

export default async function OnlineGivingHqPage() {
  const session = await requireFinanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const [{ rows, total }, providers] = await Promise.all([
    listOnlineGivingForHq({ pageSize: 50 }),
    getGivingProviderStatuses(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Online giving
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          Paystack / MoMo / demo checkouts that post only to the Head Office
          obligation ledger. Pastoral Board never opens this list — aggregates
          stay on Reports.
        </p>
        <p className="mt-2 text-sm">
          Public checkout:{" "}
          <Link href="/give" className="text-[var(--lt-accent)] underline">
            /give
          </Link>
          {canWriteFinance(session.user.role) ? null : null}
        </p>
      </div>

      <section className="lt-panel p-4 text-sm">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Providers
        </h3>
        <ul className="mt-2 space-y-1">
          {providers.map((p) => (
            <li key={p.id}>
              <span className="font-medium">{p.label}</span> — {p.notes}
            </li>
          ))}
        </ul>
      </section>

      <section className="lt-panel overflow-x-auto">
        <h3 className="border-b border-[var(--lt-line)] px-4 py-3 text-sm font-medium">
          Recent checkouts ({total})
        </h3>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">No online gifts yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-2">
                    {r.member
                      ? `${r.member.firstName} ${r.member.lastName}${
                          r.member.memberNumber
                            ? ` (${r.member.memberNumber})`
                            : ""
                        }`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    GH₵
                    {toMoneyNumber(r.amount).toLocaleString("en-GH", {
                      minimumFractionDigits: 2,
                    })}
                    {r.demoMode ? " · demo" : ""}
                  </td>
                  <td className="px-4 py-2">{r.method}</td>
                  <td className="px-4 py-2">{r.provider}</td>
                  <td className="px-4 py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
