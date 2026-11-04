import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { accessModeLabel } from "@/lib/role-labels";
import { canEditReportTemplates } from "@/lib/roles";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = canEditReportTemplates(role);

  const subNav = [
    { href: "/reports", label: "Dashboard" },
    ...(canEdit
      ? [
          { href: "/reports/templates", label: "Templates" },
          { href: "/reports/schedules", label: "Schedules" },
        ]
      : [{ href: "/reports/schedules", label: "Schedules" }]),
  ];

  return (
    <AppShell
      title="Board reports"
      subtitle={`${accessModeLabel(role, "reports")}. Aggregated Expected · Received · Outstanding — no individual giving.`}
      role={role}
      userName={session?.user?.name}
      active="reports"
      subNav={subNav}
      banner="Pastoral Board & Leadership Council — ministry oversight"
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
