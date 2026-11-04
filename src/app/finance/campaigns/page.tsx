import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFinanceAccess } from "@/lib/auth-guards";
import { listCampaignProjects } from "@/lib/finance/statements";

function money(n: number) {
  return n.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function CampaignsPage() {
  const session = await requireFinanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const campaigns = await listCampaignProjects();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Special projects & campaigns
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          Head Office view of Special Project contribution obligations — target,
          paid, and outstanding. Board still sees aggregates only on Reports.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No special project obligations yet. Create one under{" "}
          <Link href="/finance/obligations" className="lt-link">
            Pledges & obligations
          </Link>
          .
        </p>
      ) : (
        <div className="lt-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/finance/obligations/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.fellowship ? (
                      <div className="text-xs text-[var(--lt-muted)]">{c.fellowship}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/members/${c.memberId}`}
                      className="hover:underline"
                    >
                      {c.memberName}
                    </Link>
                    <div className="text-xs text-[var(--lt-muted)]">
                      {c.memberNumber ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">GH₵ {money(c.target)}</td>
                  <td className="px-4 py-3">GH₵ {money(c.paid)}</td>
                  <td className="px-4 py-3">GH₵ {money(c.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
