import { MemberStatus, ObligationKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getScopedBranchIds,
  memberBranchWhere,
  type SessionUserLike,
} from "@/lib/members/access";
import { getDashboardSnapshot } from "@/lib/reporting/aggregates";
import {
  getBalanceRollup,
  listCollectionBatches,
  listDuesArrears,
} from "@/lib/finance/service";
import { toMoneyNumber } from "@/lib/finance/money";
import {
  type DashboardProfile,
  dashboardProfileForRole,
  canAccessFinanceAggregateReports,
} from "@/lib/roles";

export type KpiCard = {
  id: string;
  label: string;
  value: number;
  format: "count" | "money";
  emphasize?: "ok" | "warn" | "muted";
};

export type ChartSeries = {
  id: string;
  title: string;
  format: "count" | "money";
  data: Array<{ label: string; value: number }>;
};

export type ActivityItem = {
  id: string;
  at: string;
  label: string;
  detail?: string;
};

export type RoleDashboardSnapshot = {
  generatedAt: string;
  profile: DashboardProfile;
  title: string;
  subtitle: string;
  kpis: KpiCard[];
  charts: ChartSeries[];
  recentActivity: ActivityItem[];
  /** Board/Council/Admin/FS finance aggregates when permitted. */
  finance?: Awaited<ReturnType<typeof getDashboardSnapshot>>;
};

async function membershipSlice(user: SessionUserLike) {
  const scoped = await getScopedBranchIds(user);
  const branchWhere = memberBranchWhere(scoped);

  const [byStatus, byBranch, recentMembers, total] = await Promise.all([
    prisma.member.groupBy({
      by: ["status"],
      where: branchWhere,
      _count: { _all: true },
    }),
    prisma.member.groupBy({
      by: ["branchId"],
      where: branchWhere,
      _count: { _all: true },
    }),
    prisma.member.findMany({
      where: branchWhere,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        memberNumber: true,
        status: true,
        createdAt: true,
        branch: { select: { name: true, code: true } },
      },
    }),
    prisma.member.count({ where: branchWhere }),
  ]);

  const branches = await prisma.branch.findMany({
    where: scoped === null ? undefined : { id: { in: scoped } },
    select: { id: true, name: true, code: true },
  });
  const branchName = new Map(branches.map((b) => [b.id, b.name]));

  const statusCount = (status: MemberStatus) =>
    byStatus.find((r) => r.status === status)?._count._all ?? 0;

  const active = statusCount(MemberStatus.Active);
  const inactive = statusCount(MemberStatus.Inactive);
  const transferred = statusCount(MemberStatus.Transferred);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newThisPeriod = await prisma.member.count({
    where: { ...branchWhere, createdAt: { gte: thirtyDaysAgo } },
  });

  const kpis: KpiCard[] = [
    { id: "members-total", label: "Members", value: total, format: "count" },
    {
      id: "members-active",
      label: "Active",
      value: active,
      format: "count",
      emphasize: "ok",
    },
    {
      id: "members-new-30d",
      label: "New (30 days)",
      value: newThisPeriod,
      format: "count",
    },
    {
      id: "members-inactive",
      label: "Inactive",
      value: inactive,
      format: "count",
      emphasize: inactive > 0 ? "warn" : "muted",
    },
  ];

  const charts: ChartSeries[] = [
    {
      id: "by-status",
      title: "Members by status",
      format: "count",
      data: byStatus
        .map((r) => ({ label: r.status, value: r._count._all }))
        .sort((a, b) => b.value - a.value),
    },
    {
      id: "by-branch",
      title: "Members by branch",
      format: "count",
      data: byBranch
        .map((r) => ({
          label: branchName.get(r.branchId) ?? r.branchId,
          value: r._count._all,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12),
    },
  ];

  const recentActivity: ActivityItem[] = recentMembers.map((m) => ({
    id: m.id,
    at: m.createdAt.toISOString(),
    label: `${m.firstName} ${m.lastName}`,
    detail: [
      m.memberNumber ? `#${m.memberNumber}` : null,
      m.branch.name,
      m.status,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  return { kpis, charts, recentActivity, transferred };
}

async function financeSlice() {
  const [rollup, batches, arrears, snapshot] = await Promise.all([
    getBalanceRollup({}),
    listCollectionBatches(),
    listDuesArrears({}),
    getDashboardSnapshot(),
  ]);

  const openVariances = batches.filter((b) => b.hasVariance).length;
  const expected = toMoneyNumber(rollup.totals.expected);
  const paid = toMoneyNumber(rollup.totals.paid);
  const outstanding = toMoneyNumber(rollup.totals.outstanding);

  const kpis: KpiCard[] = [
    { id: "expected", label: "Expected", value: expected, format: "money" },
    {
      id: "paid",
      label: "Paid",
      value: paid,
      format: "money",
      emphasize: "ok",
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: outstanding,
      format: "money",
      emphasize: outstanding > 0 ? "warn" : "ok",
    },
    {
      id: "arrears",
      label: "Dues arrears",
      value: arrears.length,
      format: "count",
      emphasize: arrears.length > 0 ? "warn" : "ok",
    },
    {
      id: "batch-variance",
      label: "Batch variances",
      value: openVariances,
      format: "count",
      emphasize: openVariances > 0 ? "warn" : "ok",
    },
  ];

  const charts: ChartSeries[] = [
    {
      id: "by-kind-outstanding",
      title: "Outstanding by contribution kind",
      format: "money",
      data: snapshot.byKind.map((r) => ({
        label: r.kind === ObligationKind.SpecialProject ? "Special Project" : r.kind,
        value: r.outstanding,
      })),
    },
    {
      id: "by-branch-paid",
      title: "Paid by branch",
      format: "money",
      data: snapshot.byBranch.map((r) => ({
        label: r.branchName,
        value: r.paid,
      })),
    },
  ];

  const recentActivity: ActivityItem[] = batches.slice(0, 6).map((b) => ({
    id: b.id,
    at: typeof b.batchDate === "string" ? b.batchDate : new Date(b.batchDate).toISOString(),
    label: b.label,
    detail: b.hasVariance
      ? `Variance ${b.varianceAmount}`
      : `Counted ${b.countedTotal} · system ${b.systemTotal}`,
  }));

  return { kpis, charts, recentActivity, finance: snapshot };
}

const PROFILE_COPY: Record<
  DashboardProfile,
  { title: string; subtitle: string }
> = {
  membership: {
    title: "Membership dashboard",
    subtitle:
      "Live register counts for your branch scope. Contributions stay at Head Office.",
  },
  finance: {
    title: "Head Office contributions dashboard",
    subtitle:
      "Expected / Paid / Outstanding, dues arrears, and Saturday batch variance — live from the ledger.",
  },
  board: {
    title: "Pastoral Board dashboard",
    subtitle:
      "Aggregated Expected / Paid / Outstanding only — no individual givers.",
  },
  council: {
    title: "Leadership Council dashboard",
    subtitle:
      "Aggregated Expected / Paid / Outstanding with branch and period trends.",
  },
  admin: {
    title: "Data Centre overview",
    subtitle:
      "Membership and contribution KPIs for Data Centre. Board views remain aggregates-only for pastoral roles.",
  },
};

/**
 * Live role landing dashboard for `/reports`.
 * Reuses finance aggregate APIs; membership queries respect branch scope.
 */
export async function getRoleDashboard(
  user: SessionUserLike,
): Promise<RoleDashboardSnapshot> {
  const profile = dashboardProfileForRole(user.role);
  if (!profile) {
    throw new Error("No dashboard profile for this role");
  }

  const copy = PROFILE_COPY[profile];
  const generatedAt = new Date().toISOString();

  if (profile === "membership") {
    const membership = await membershipSlice(user);
    return {
      generatedAt,
      profile,
      ...copy,
      kpis: membership.kpis,
      charts: membership.charts,
      recentActivity: membership.recentActivity,
    };
  }

  if (profile === "board" || profile === "council") {
    const finance = await getDashboardSnapshot();
    const kpis: KpiCard[] = [
      {
        id: "expected",
        label: "Expected",
        value: finance.totals.expected,
        format: "money",
      },
      {
        id: "paid",
        label: "Paid",
        value: finance.totals.paid,
        format: "money",
        emphasize: "ok",
      },
      {
        id: "outstanding",
        label: "Outstanding",
        value: finance.totals.outstanding,
        format: "money",
        emphasize: finance.totals.outstanding > 0 ? "warn" : "ok",
      },
      {
        id: "obligations",
        label: "Obligations",
        value: finance.totals.obligationCount,
        format: "count",
      },
    ];
    const charts: ChartSeries[] = [
      {
        id: "by-kind",
        title: "By contribution kind",
        format: "money",
        data: finance.byKind.map((r) => ({
          label:
            r.kind === ObligationKind.SpecialProject
              ? "Special Project"
              : r.kind,
          value: r.outstanding,
        })),
      },
    ];
    if (profile === "council") {
      charts.push({
        id: "by-branch",
        title: "Outstanding by branch",
        format: "money",
        data: finance.byBranch.map((r) => ({
          label: r.branchName,
          value: r.outstanding,
        })),
      });
    }
    return {
      generatedAt,
      profile,
      ...copy,
      kpis,
      charts,
      recentActivity: [],
      finance,
    };
  }

  // finance + admin
  const [membership, financePart] = await Promise.all([
    membershipSlice(user),
    canAccessFinanceAggregateReports(user.role)
      ? financeSlice()
      : Promise.resolve(null),
  ]);

  if (profile === "finance" && financePart) {
    return {
      generatedAt,
      profile,
      ...copy,
      kpis: financePart.kpis,
      charts: financePart.charts,
      recentActivity: financePart.recentActivity,
      finance: financePart.finance,
    };
  }

  // admin: combine
  const financeKpis = financePart
    ? financePart.kpis.filter((k) =>
        ["expected", "outstanding", "arrears"].includes(k.id),
      )
    : [];
  const adminKpis: KpiCard[] = [
    ...membership.kpis.slice(0, 2),
    ...financeKpis,
  ];

  return {
    generatedAt,
    profile,
    ...copy,
    kpis: adminKpis,
    charts: [
      ...membership.charts.slice(0, 1),
      ...(financePart?.charts.slice(0, 1) ?? []),
    ],
    recentActivity: [
      ...membership.recentActivity.slice(0, 4),
      ...(financePart?.recentActivity.slice(0, 4) ?? []),
    ],
    finance: financePart?.finance,
  };
}
