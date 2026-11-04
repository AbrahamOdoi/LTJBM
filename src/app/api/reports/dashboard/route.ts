import { NextResponse } from "next/server";
import { withReportingAccess } from "@/app/api/reports/_guard";
import { requireReportingAccess } from "@/lib/auth-guards";
import { getRoleDashboard } from "@/lib/reporting/role-dashboard";
import { dashboardProfileForRole } from "@/lib/roles";

/**
 * Live role landing dashboard snapshot.
 * Membership KPIs for Clerk/Branch; finance aggregates for Board/FS/Admin.
 */
export async function GET() {
  return withReportingAccess(async () => {
    const session = await requireReportingAccess();
    const user = {
      id: session.user.id,
      role: session.user.role,
    };
    const snapshot = await getRoleDashboard(user);
    const profile = dashboardProfileForRole(session.user.role);

    return NextResponse.json({
      role: session.user.role,
      view: profile,
      ...snapshot,
    });
  });
}
