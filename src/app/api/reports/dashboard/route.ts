import { ObligationKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withReportingAccess } from "@/app/api/reports/_guard";
import { getDashboardSnapshot } from "@/lib/reporting/aggregates";
import { requireReportingAccess } from "@/lib/auth-guards";
import { reportingViewMode } from "@/lib/roles";

/**
 * Live Board/Council dashboard snapshot.
 * Refreshes from DB on every request (no manual rebuild after payments).
 */
export async function GET(request: NextRequest) {
  return withReportingAccess(async () => {
    const session = await requireReportingAccess();
    const params = request.nextUrl.searchParams;
    const kindParam = params.get("kind");
    const kind =
      kindParam &&
      (Object.values(ObligationKind) as string[]).includes(kindParam)
        ? (kindParam as ObligationKind)
        : undefined;

    const snapshot = await getDashboardSnapshot({
      kind,
      periodStart: params.get("periodStart")
        ? new Date(params.get("periodStart")!)
        : undefined,
      periodEnd: params.get("periodEnd")
        ? new Date(params.get("periodEnd")!)
        : undefined,
    });

    const view = reportingViewMode(session.user.role);

    return NextResponse.json({
      view,
      role: session.user.role,
      ...snapshot,
      // Board: kind + totals; Council/Admin also see branch & period.
      sections:
        view === "board"
          ? ["totals", "byKind", "charts"]
          : ["totals", "byKind", "byBranch", "byPeriod", "charts"],
    });
  });
}
