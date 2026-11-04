import { ObligationKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getScopedBranchIds,
  memberBranchWhere,
  type SessionUserLike,
} from "@/lib/members/access";
import { getDashboardSnapshot } from "@/lib/reporting/aggregates";
import {
  listCollectionBatches,
  listDuesArrears,
  getBalanceRollup,
} from "@/lib/finance/service";
import { obligationKindLabel } from "@/lib/church-labels";
import { toMoneyNumber } from "@/lib/finance/money";
import {
  canAccessFinanceAggregateReports,
  canAccessFinanceDetailReports,
  type Role,
} from "@/lib/roles";
import { ReportingValidationError } from "@/lib/reporting/service";

export type StandardReportId =
  | "membership-by-branch"
  | "new-members-period"
  | "dues-arrears"
  | "contributions-summary"
  | "saturday-batch-variance"
  | "board-expected-paid-outstanding";

export type ReportColumn = { key: string; label: string };
export type ReportRow = Record<string, string | number | boolean | null>;

export type StandardReportMeta = {
  id: StandardReportId;
  name: string;
  description: string;
  category: "membership" | "contributions" | "board";
  /** Query params the run screen may collect. */
  filters: Array<"branchId" | "periodStart" | "periodEnd" | "kind">;
};

export type StandardReportResult = {
  meta: StandardReportMeta;
  generatedAt: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary?: string;
};

const CATALOG: StandardReportMeta[] = [
  {
    id: "membership-by-branch",
    name: "Membership by branch",
    description: "Member counts by branch and status for the register.",
    category: "membership",
    filters: ["branchId"],
  },
  {
    id: "new-members-period",
    name: "New members (period)",
    description: "Members registered in a date range.",
    category: "membership",
    filters: ["periodStart", "periodEnd", "branchId"],
  },
  {
    id: "dues-arrears",
    name: "Dues arrears",
    description:
      "Members with outstanding dues. Head Office Financial Secretary / Data Centre only.",
    category: "contributions",
    filters: ["periodStart", "periodEnd"],
  },
  {
    id: "contributions-summary",
    name: "Contributions summary by type / period",
    description: "Expected / Paid / Outstanding rolled up by contribution kind.",
    category: "contributions",
    filters: ["periodStart", "periodEnd", "kind"],
  },
  {
    id: "saturday-batch-variance",
    name: "Saturday batch variance",
    description:
      "Counted total vs system total for Saturday collection batches. Head Office only.",
    category: "contributions",
    filters: [],
  },
  {
    id: "board-expected-paid-outstanding",
    name: "Board Expected / Paid / Outstanding",
    description:
      "Pastoral Board / Leadership Council aggregate rollup — no individual givers.",
    category: "board",
    filters: ["periodStart", "periodEnd", "kind"],
  },
];

export function listStandardReportCatalog(role: Role | string): StandardReportMeta[] {
  return CATALOG.filter((meta) => canRunStandardReport(role, meta.id));
}

export function getStandardReportMeta(
  id: string,
): StandardReportMeta | undefined {
  return CATALOG.find((r) => r.id === id);
}

export function canRunStandardReport(
  role: Role | string | undefined | null,
  id: StandardReportId,
): boolean {
  switch (id) {
    case "membership-by-branch":
    case "new-members-period":
      return true;
    case "dues-arrears":
    case "saturday-batch-variance":
      return canAccessFinanceDetailReports(role);
    case "contributions-summary":
    case "board-expected-paid-outstanding":
      return canAccessFinanceAggregateReports(role);
    default:
      return false;
  }
}

export type RunStandardFilters = {
  branchId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  kind?: ObligationKind;
};

export async function runStandardReport(
  user: SessionUserLike,
  id: StandardReportId,
  filters: RunStandardFilters = {},
): Promise<StandardReportResult> {
  const meta = getStandardReportMeta(id);
  if (!meta) {
    throw new ReportingValidationError("Unknown standard report.", 404);
  }
  if (!canRunStandardReport(user.role, id)) {
    throw new ReportingValidationError(
      "This report is not available for your ministry role.",
      403,
    );
  }

  const generatedAt = new Date().toISOString();

  switch (id) {
    case "membership-by-branch":
      return {
        meta,
        generatedAt,
        ...(await runMembershipByBranch(user, filters)),
      };
    case "new-members-period":
      return {
        meta,
        generatedAt,
        ...(await runNewMembersPeriod(user, filters)),
      };
    case "dues-arrears":
      return { meta, generatedAt, ...(await runDuesArrears(filters)) };
    case "contributions-summary":
      return {
        meta,
        generatedAt,
        ...(await runContributionsSummary(filters)),
      };
    case "saturday-batch-variance":
      return { meta, generatedAt, ...(await runBatchVariance()) };
    case "board-expected-paid-outstanding":
      return {
        meta,
        generatedAt,
        ...(await runBoardRollup(filters)),
      };
    default:
      throw new ReportingValidationError("Unknown standard report.", 404);
  }
}

async function runMembershipByBranch(
  user: SessionUserLike,
  filters: RunStandardFilters,
) {
  const scoped = await getScopedBranchIds(user);
  const where = {
    ...memberBranchWhere(scoped),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
  };

  const grouped = await prisma.member.groupBy({
    by: ["branchId", "status"],
    where,
    _count: { _all: true },
  });
  const branches = await prisma.branch.findMany({
    where:
      scoped === null
        ? filters.branchId
          ? { id: filters.branchId }
          : undefined
        : { id: { in: scoped } },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  const nameById = new Map(branches.map((b) => [b.id, b]));

  const columns: ReportColumn[] = [
    { key: "branch", label: "Branch" },
    { key: "code", label: "Code" },
    { key: "status", label: "Status" },
    { key: "count", label: "Members" },
  ];

  const rows: ReportRow[] = grouped
    .map((g) => {
      const b = nameById.get(g.branchId);
      return {
        branch: b?.name ?? g.branchId,
        code: b?.code ?? "",
        status: g.status,
        count: g._count._all,
      };
    })
    .sort((a, b) =>
      String(a.branch).localeCompare(String(b.branch)) ||
      String(a.status).localeCompare(String(b.status)),
    );

  return {
    columns,
    rows,
    summary: `${rows.length} status rows across ${branches.length} branch(es).`,
  };
}

async function runNewMembersPeriod(
  user: SessionUserLike,
  filters: RunStandardFilters,
) {
  const scoped = await getScopedBranchIds(user);
  const periodStart =
    filters.periodStart ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d;
    })();
  const periodEnd = filters.periodEnd ?? new Date();

  const members = await prisma.member.findMany({
    where: {
      ...memberBranchWhere(scoped),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      memberNumber: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      phone: true,
      branch: { select: { name: true, code: true } },
    },
  });

  return {
    columns: [
      { key: "memberNumber", label: "Member #" },
      { key: "name", label: "Name" },
      { key: "branch", label: "Branch" },
      { key: "status", label: "Status" },
      { key: "registered", label: "Registered" },
      { key: "phone", label: "Phone" },
    ] satisfies ReportColumn[],
    rows: members.map((m) => ({
      memberNumber: m.memberNumber,
      name: `${m.firstName} ${m.lastName}`,
      branch: `${m.branch.name} (${m.branch.code})`,
      status: m.status,
      registered: m.createdAt.toISOString().slice(0, 10),
      phone: m.phone,
    })) satisfies ReportRow[],
    summary: `${members.length} new member(s) from ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}.`,
  };
}

async function runDuesArrears(filters: RunStandardFilters) {
  const arrears = await listDuesArrears({
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
  });

  return {
    columns: [
      { key: "member", label: "Member" },
      { key: "memberNumber", label: "Member #" },
      { key: "period", label: "Period start" },
      { key: "expected", label: "Expected" },
      { key: "paid", label: "Paid" },
      { key: "outstanding", label: "Outstanding" },
    ] satisfies ReportColumn[],
    rows: arrears.map((row) => ({
      member: row.member?.name ?? "—",
      memberNumber: row.member?.memberNumber ?? null,
      period: String(row.periodStart).slice(0, 10),
      expected: row.balances.expected,
      paid: row.balances.paid,
      outstanding: row.balances.outstanding,
    })) satisfies ReportRow[],
    summary: `${arrears.length} dues obligation(s) in arrears.`,
  };
}

async function runContributionsSummary(filters: RunStandardFilters) {
  const rollup = await getBalanceRollup({
    kind: filters.kind,
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
  });

  return {
    columns: [
      { key: "kind", label: "Kind" },
      { key: "obligations", label: "Obligations" },
      { key: "expected", label: "Expected" },
      { key: "paid", label: "Paid" },
      { key: "outstanding", label: "Outstanding" },
    ] satisfies ReportColumn[],
    rows: rollup.byKind.map((r) => ({
      kind: obligationKindLabel(r.kind),
      obligations: r.obligationCount,
      expected: r.expected,
      paid: r.paid,
      outstanding: r.outstanding,
    })) satisfies ReportRow[],
    summary: `Totals — Expected ${toMoneyNumber(rollup.totals.expected)}, Paid ${toMoneyNumber(rollup.totals.paid)}, Outstanding ${toMoneyNumber(rollup.totals.outstanding)}.`,
  };
}

async function runBatchVariance() {
  const batches = await listCollectionBatches();
  return {
    columns: [
      { key: "date", label: "Batch date" },
      { key: "label", label: "Label" },
      { key: "counted", label: "Counted total" },
      { key: "system", label: "System total" },
      { key: "variance", label: "Variance" },
      { key: "flag", label: "Has variance" },
    ] satisfies ReportColumn[],
    rows: batches.map((b) => ({
      date: String(b.batchDate).slice(0, 10),
      label: b.label,
      counted: b.countedTotal,
      system: b.systemTotal,
      variance: b.varianceAmount,
      flag: b.hasVariance ? "Yes" : "No",
    })) satisfies ReportRow[],
    summary: `${batches.filter((b) => b.hasVariance).length} of ${batches.length} batch(es) with counted vs system variance.`,
  };
}

async function runBoardRollup(filters: RunStandardFilters) {
  const snapshot = await getDashboardSnapshot({
    kind: filters.kind,
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
  });

  const kindRows: ReportRow[] = snapshot.byKind.map((r) => ({
    section: "Kind",
    label: obligationKindLabel(r.kind),
    expected: r.expected,
    paid: r.paid,
    outstanding: r.outstanding,
    count: r.obligationCount,
  }));
  const branchRows: ReportRow[] = snapshot.byBranch.map((r) => ({
    section: "Branch",
    label: r.branchName,
    expected: r.expected,
    paid: r.paid,
    outstanding: r.outstanding,
    count: r.obligationCount,
  }));

  return {
    columns: [
      { key: "section", label: "Section" },
      { key: "label", label: "Label" },
      { key: "expected", label: "Expected" },
      { key: "paid", label: "Paid" },
      { key: "outstanding", label: "Outstanding" },
      { key: "count", label: "Obligations" },
    ] satisfies ReportColumn[],
    rows: [
      {
        section: "Totals",
        label: "All",
        expected: snapshot.totals.expected,
        paid: snapshot.totals.paid,
        outstanding: snapshot.totals.outstanding,
        count: snapshot.totals.obligationCount,
      },
      ...kindRows,
      ...branchRows,
    ],
    summary:
      "Aggregates only — individual giving is not included on Board reports.",
  };
}
