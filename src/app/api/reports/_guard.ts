import { NextResponse } from "next/server";
import {
  AuthGuardError,
  requireReportTemplateEdit,
  requireReportingAccess,
} from "@/lib/auth-guards";
import { ReportingValidationError } from "@/lib/reporting/service";
import {
  assertSameOriginMutation,
  SecurityGuardError,
} from "@/lib/security";

export async function withReportingAccess<T>(
  handler: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    await requireReportingAccess();
    return await handler();
  } catch (error) {
    return reportingErrorResponse(error);
  }
}

export async function withReportTemplateEdit<T>(
  handler: () => Promise<T>,
  request?: Request,
): Promise<T | NextResponse> {
  try {
    if (request) assertSameOriginMutation(request);
    await requireReportTemplateEdit();
    return await handler();
  } catch (error) {
    return reportingErrorResponse(error);
  }
}

export function reportingErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthGuardError || error instanceof SecurityGuardError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ReportingValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
