import { NextResponse } from "next/server";
import {
  AuthGuardError,
  requireReportTemplateEdit,
  requireReportingAccess,
} from "@/lib/auth-guards";
import { ReportingValidationError } from "@/lib/reporting/service";

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
): Promise<T | NextResponse> {
  try {
    await requireReportTemplateEdit();
    return await handler();
  } catch (error) {
    return reportingErrorResponse(error);
  }
}

export function reportingErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthGuardError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ReportingValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
