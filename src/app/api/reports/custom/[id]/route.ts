import { NextRequest, NextResponse } from "next/server";
import {
  reportingErrorResponse,
  withReportingAccess,
} from "@/app/api/reports/_guard";
import { requireReportingAccess } from "@/lib/auth-guards";
import {
  deleteSavedReport,
  getSavedReport,
} from "@/lib/reporting/custom-reports";
import { ReportingValidationError } from "@/lib/reporting/service";
import { assertSameOriginMutation } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withReportingAccess(async () => {
    const session = await requireReportingAccess();
    const { id } = await params;
    const saved = await getSavedReport(
      { id: session.user.id, role: session.user.role },
      id,
    );
    if (!saved) {
      throw new ReportingValidationError("Saved report not found.", 404);
    }
    return NextResponse.json(saved);
  }).catch((error) => reportingErrorResponse(error));
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withReportingAccess(async () => {
    assertSameOriginMutation(request);
    const session = await requireReportingAccess();
    const { id } = await params;
    await deleteSavedReport(
      { id: session.user.id, role: session.user.role },
      id,
    );
    return NextResponse.json({ ok: true });
  }).catch((error) => reportingErrorResponse(error));
}
