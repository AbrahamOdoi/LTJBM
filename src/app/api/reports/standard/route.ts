import { NextResponse } from "next/server";
import { withReportingAccess } from "@/app/api/reports/_guard";
import { requireReportingAccess } from "@/lib/auth-guards";
import { listStandardReportCatalog } from "@/lib/reporting/standard-reports";

/** Standard report library catalog filtered by ministry role. */
export async function GET() {
  return withReportingAccess(async () => {
    const session = await requireReportingAccess();
    const reports = listStandardReportCatalog(session.user.role);
    return NextResponse.json({ reports });
  });
}
