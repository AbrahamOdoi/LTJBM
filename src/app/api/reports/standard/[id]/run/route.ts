import { ObligationKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  reportingErrorResponse,
  withReportingAccess,
} from "@/app/api/reports/_guard";
import { requireReportingAccess } from "@/lib/auth-guards";
import {
  getStandardReportMeta,
  runStandardReport,
  type StandardReportId,
} from "@/lib/reporting/standard-reports";
import { rowsToCsv } from "@/lib/reporting/export-csv";
import { ReportingValidationError } from "@/lib/reporting/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withReportingAccess(async () => {
    const session = await requireReportingAccess();
    const { id } = await params;
    const meta = getStandardReportMeta(id);
    if (!meta) {
      throw new ReportingValidationError("Unknown standard report.", 404);
    }

    const search = request.nextUrl.searchParams;
    const kindParam = search.get("kind");
    const kind =
      kindParam &&
      (Object.values(ObligationKind) as string[]).includes(kindParam)
        ? (kindParam as ObligationKind)
        : undefined;

    const result = await runStandardReport(
      { id: session.user.id, role: session.user.role },
      id as StandardReportId,
      {
        branchId: search.get("branchId") ?? undefined,
        periodStart: search.get("periodStart")
          ? new Date(search.get("periodStart")!)
          : undefined,
        periodEnd: search.get("periodEnd")
          ? new Date(search.get("periodEnd")!)
          : undefined,
        kind,
      },
    );

    if (search.get("format") === "csv") {
      const csv = rowsToCsv(result.columns, result.rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${meta.id}.csv"`,
        },
      });
    }

    return NextResponse.json(result);
  }).catch((error) => reportingErrorResponse(error));
}
