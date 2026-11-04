import { NextRequest, NextResponse } from "next/server";
import {
  reportingErrorResponse,
  withReportingAccess,
} from "@/app/api/reports/_guard";
import { requireReportingAccess } from "@/lib/auth-guards";
import { runSavedReport } from "@/lib/reporting/custom-reports";
import { rowsToCsv } from "@/lib/reporting/export-csv";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withReportingAccess(async () => {
    const session = await requireReportingAccess();
    const { id } = await params;
    const result = await runSavedReport(
      { id: session.user.id, role: session.user.role },
      id,
    );

    if (request.nextUrl.searchParams.get("format") === "csv") {
      const csv = rowsToCsv(result.columns, result.rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="custom-${id}.csv"`,
        },
      });
    }

    return NextResponse.json(result);
  }).catch((error) => reportingErrorResponse(error));
}
