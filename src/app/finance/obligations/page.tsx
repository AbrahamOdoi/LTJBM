import { auth } from "@/auth";
import { CreateObligationForm } from "@/components/finance/create-obligation-form";
import { MoneyCell } from "@/components/finance/money-cell";
import { DataTable, DataTableFilterBar } from "@/components/data-table";
import { prisma } from "@/lib/db";
import { hrefWithParams, parsePageParams } from "@/lib/data-table";
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
  searchParams: Promise<{
    kind?: string;
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const session = await auth();
  const canWrite = canWriteFinance(session?.user?.role);
  const sp = await searchParams;
  const { kind, q } = sp;
  const { page, pageSize } = parsePageParams(sp);

  const parsedKind =
    kind &&
    ["Pledge", "Tithe", "Dues", "SpecialProject", "Thanksgiving"].includes(kind)
      ? (kind as
          | "Pledge"
          | "Tithe"
          | "Dues"
          | "SpecialProject"
          | "Thanksgiving")
      : undefined;

  const [types, members, fellowships, listed] = await Promise.all([
    listObligationTypes(),
    listFinanceMembers(),
    prisma.fellowshipMinistry.findMany({ orderBy: { name: "asc" } }),
    listObligations({
      kind: parsedKind,
      q,
      page,
      pageSize,
    }),
  ]);

  const filters = { kind, q };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Pledges &amp; contribution obligations
        </h2>
        <p className="mt-1.5 text-sm text-[var(--lt-muted)]">
          Pledge (instalments), Special Project (targets), Tithe, Dues,
          Thanksgiving — Head Office posting only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterChip
          href={hrefWithParams("/finance/obligations", { q }, { kind: undefined, page: 1 })}
          label="All"
          active={!kind}
        />
        {types.map((t) => (
          <FilterChip
            key={t.id}
            href={hrefWithParams("/finance/obligations", { q }, { kind: t.kind, page: 1 })}
            label={t.name}
            active={kind === t.kind}
          />
        ))}
      </div>

      <DataTableFilterBar className="sm:grid-cols-[1fr_auto]" submitLabel="Search">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search member, number, or type…"
          className="lt-input"
        />
        {kind ? <input type="hidden" name="kind" value={kind} /> : null}
      </DataTableFilterBar>

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

      <DataTable
        columns={[
          { key: "member", header: "Member" },
          { key: "type", header: "Type" },
          { key: "period", header: "Period" },
          { key: "expected", header: "Expected" },
          { key: "paid", header: "Paid" },
          { key: "outstanding", header: "Outstanding" },
        ]}
        rows={listed.items}
        rowKey={(ob) => ob.id}
        emptyTitle={kind ? `No ${kind} obligations yet` : "No obligations yet"}
        emptyBody={
          canWrite
            ? "Create a Pledge with instalments or a Special Project with a target using the form above, then record payments on the obligation detail."
            : "Ask a Financial Secretary to create pledges or special projects for the demo."
        }
        pagination={{
          pathname: "/finance/obligations",
          filters,
          result: listed,
          noun: "obligations",
        }}
        renderCell={(ob, key) => {
          switch (key) {
            case "member":
              return (
                <Link
                  href={`/finance/obligations/${ob.id}`}
                  className="lt-link"
                >
                  {ob.member.name}
                </Link>
              );
            case "type":
              return (
                <>
                  {ob.obligationType.name}
                  {ob.instalmentCount
                    ? ` · ${ob.instalmentCount} instalments`
                    : ""}
                  {ob.projectTargetAmount != null
                    ? ` · target ${ob.projectTargetAmount}`
                    : ""}
                </>
              );
            case "period":
              return (
                <span className="tabular-nums">
                  {ob.periodStart.slice(0, 10)}
                  {ob.periodEnd ? ` → ${ob.periodEnd.slice(0, 10)}` : ""}
                </span>
              );
            case "expected":
              return <MoneyCell value={ob.balances.expected} />;
            case "paid":
              return <MoneyCell value={ob.balances.paid} emphasize="ok" />;
            case "outstanding":
              return (
                <MoneyCell
                  value={ob.balances.outstanding}
                  emphasize={ob.balances.outstanding > 0 ? "warn" : "muted"}
                />
              );
            default:
              return null;
          }
        }}
      />
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
