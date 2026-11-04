import { NextRequest, NextResponse } from "next/server";
import {
  reportingErrorResponse,
  withReportingAccess,
} from "@/app/api/reports/_guard";
import { requireReportingAccess } from "@/lib/auth-guards";
import {
  createSavedReport,
  listSavedReports,
  parseSaveCustomReport,
} from "@/lib/reporting/custom-reports";
import { assertSameOriginMutation } from "@/lib/security";

export async function GET() {
  return withReportingAccess(async () => {
    const session = await requireReportingAccess();
    const reports = await listSavedReports({
      id: session.user.id,
      role: session.user.role,
    });
    return NextResponse.json({ reports });
  });
}

export async function POST(request: NextRequest) {
  return withReportingAccess(async () => {
    assertSameOriginMutation(request);
    const session = await requireReportingAccess();
    const body = await request.json();
    const input = parseSaveCustomReport(body);
    const saved = await createSavedReport(
      { id: session.user.id, role: session.user.role },
      input,
    );
    return NextResponse.json(saved, { status: 201 });
  }).catch((error) => reportingErrorResponse(error));
}
