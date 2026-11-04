import { auth } from "@/auth";
import { RoleDashboardLive } from "@/components/reporting/role-dashboard-live";
import { getRoleDashboard } from "@/lib/reporting/role-dashboard";
import { dashboardProfileForRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function ReportsDashboardPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  const profile = dashboardProfileForRole(session.user.role);
  if (!profile) {
    redirect("/forbidden?reason=reporting");
  }

  const snapshot = await getRoleDashboard({
    id: session.user.id,
    role: session.user.role,
  });

  return (
    <RoleDashboardLive
      initial={{
        role: session.user.role,
        ...snapshot,
      }}
    />
  );
}
