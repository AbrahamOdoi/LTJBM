import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { accessModeLabel } from "@/lib/role-labels";
import {
  canAccessFinanceAggregateReports,
  canEditReportTemplates,
  dashboardProfileForRole,
} from "@/lib/roles";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = canEditReportTemplates(role);
  const profile = dashboardProfileForRole(role);
  const financeAgg = canAccessFinanceAggregateReports(role);

  const subNav = [
    { href: "/reports", label: "Dashboard" },
    { href: "/reports/library", label: "Standard reports" },
    { href: "/reports/builder", label: "Custom reports" },
    ...(canEdit
      ? [
          { href: "/reports/templates", label: "Board templates" },
          { href: "/reports/schedules", label: "Schedules" },
        ]
      : financeAgg
        ? [{ href: "/reports/schedules", label: "Schedules" }]
        : []),
  ];

  const subtitle =
    profile === "membership"
      ? `${accessModeLabel(role, "reports")}. Membership KPIs and printable register reports.`
      : profile === "board" || profile === "council"
        ? `${accessModeLabel(role, "reports")}. Expected / Paid / Outstanding only — no individual givers.`
        : `${accessModeLabel(role, "reports")}. Dashboards, standard reports, and custom builder.`;

  return (
    <AppShell
      title="Reports"
      subtitle={subtitle}
      role={role}
      userName={session?.user?.name}
      active="reports"
      subNav={subNav}
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
