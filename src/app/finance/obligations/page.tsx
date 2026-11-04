import { auth } from "@/auth";
import { CreateObligationForm } from "@/components/finance/create-obligation-form";
import { MoneyCell } from "@/components/finance/money-cell";
import { EmptyState } from "@/components/empty-state";
import { prisma } from "@/lib/db";
import {
  listFinanceMembers,
  listObligationTypes,
  listObligations,
} from "@/lib/finance/service";
import { canWriteFinance } from "@/lib/roles";
import Link from "next/link";

export default async function ObligationsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const session = await auth();
  const canWrite = canWriteFinance(session?.user?.role);
  const { kind } = await searchParams;

  const [types, members, fellowships, obligations] = await Promise.all([
    listObligationTypes(),
    listFinanceMembers(),
    prisma.fellowshipMinistry.findMany({ orderBy: { name: "asc" } }),
    listObligations({
      kind:
        kind &&
        ["Pledge", "Tithe", "Dues", "SpecialProject", "Thanksgiving"].includes(
          kind,
        )
          ? (kind as
              | "Pledge"
              | "Tithe"
              | "Dues"
              | "SpecialProject"
              | "Thanksgiving")
          : undefined,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Pledges &amp; contribution obligations
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Pledge (instalments), Special Project (targets), Tithe, Dues,
          Thanksgiving — Head Office posting only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterChip href="/finance/obligations" label="All" active={!kind} />
        {types.map((t) => (
          <FilterChip
            key={t.id}
            href={`/finance/obligations?kind=${t.kind}`}
            label={t.name}
            active={kind === t.kind}
          />
        ))}
      </div>

      <CreateObligationForm
        canWrite={canWrite}
        types={types}
        members={members.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          memberNumber: m.memberNumber,
        }))}
        fellowships={fellowships}
      />

      {obligations.length === 0 ? (
        <EmptyState
          title={kind ? `No ${kind} obligations yet` : "No obligations yet"}
          body={
            canWrite
              ? "Create a Pledge with instalments or a Special Project with a target using the form above, then record payments on the obligation detail."
              : "Ask a Financial Secretary to create pledges or special projects for the demo."
          }
        />
      ) : (
        <div className="lt-table-wrap">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f9fafb] text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Expected</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {obligations.map((ob) => (
                <tr key={ob.id} className="border-t border-[var(--lt-line)]/70">
                  <td className="px-4 py-3">
                    <Link
                      href={`/finance/obligations/${ob.id}`}
                      className="lt-link"
                    >
                      {ob.member.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {ob.obligationType.name}
                    {ob.instalmentCount
                      ? ` · ${ob.instalmentCount} instalments`
                      : ""}
                    {ob.projectTargetAmount != null
                      ? ` · target ${ob.projectTargetAmount}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {ob.periodStart.slice(0, 10)}
                    {ob.periodEnd ? ` → ${ob.periodEnd.slice(0, 10)}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell value={ob.balances.expected} />
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell value={ob.balances.paid} emphasize="ok" />
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell
                      value={ob.balances.outstanding}
                      emphasize={ob.balances.outstanding > 0 ? "warn" : "muted"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 transition-colors ${
        active
          ? "bg-[var(--lt-ink)] text-white"
          : "lt-btn-secondary !py-1.5"
      }`}
    >
      {label}
    </Link>
  );
}
