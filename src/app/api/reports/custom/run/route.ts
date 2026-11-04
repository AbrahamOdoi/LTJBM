import { NextRequest, NextResponse } from "next/server";
import {
  reportingErrorResponse,
  withReportingAccess,
} from "@/app/api/reports/_guard";
import { requireReportingAccess } from "@/lib/auth-guards";
import {
  CUSTOM_DATASETS,
  runCustomReportDefinition,
  type CustomDataset,
} from "@/lib/reporting/custom-reports";
import { ReportingValidationError } from "@/lib/reporting/service";
import { assertSameOriginMutation } from "@/lib/security";

export async function POST(request: NextRequest) {
  return withReportingAccess(async () => {
    assertSameOriginMutation(request);
    const session = await requireReportingAccess();
    const body = (await request.json()) as {
      name?: string;
      dataset?: string;
      filters?: Record<string, string | undefined>;
      columns?: string[];
    };

    if (
      !body.dataset ||
      !(CUSTOM_DATASETS as readonly string[]).includes(body.dataset)
    ) {
      throw new ReportingValidationError("dataset must be members or contributions.");
    }
    if (!Array.isArray(body.columns) || body.columns.length === 0) {
      throw new ReportingValidationError("Select at least one column.");
    }

    const result = await runCustomReportDefinition(
      { id: session.user.id, role: session.user.role },
      {
        name: body.name,
        dataset: body.dataset as CustomDataset,
        filters: body.filters ?? {},
        columns: body.columns,
      },
    );
    return NextResponse.json(result);
  }).catch((error) => reportingErrorResponse(error));
}
