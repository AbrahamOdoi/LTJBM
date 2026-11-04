import { NextResponse } from "next/server";
import { reportingErrorResponse } from "@/app/api/reports/_guard";
import {
  AuthGuardError,
  requireReportTemplateEdit,
} from "@/lib/auth-guards";
import { sendMonthlyBoardReport } from "@/lib/reporting/email";

/**
 * Trigger the monthly Board email (demo / cron).
 *
 * Auth options:
 * 1. Signed-in Admin (Data Centre) session
 * 2. Authorization: Bearer $REPORT_CRON_SECRET (for scripts / cron)
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.REPORT_CRON_SECRET?.trim();
    let actorId: string | null = null;

    if (authHeader?.startsWith("Bearer ") && cronSecret) {
      const token = authHeader.slice("Bearer ".length).trim();
      if (token !== cronSecret) {
        throw new AuthGuardError("Invalid REPORT_CRON_SECRET", 401);
      }
    } else {
      const session = await requireReportTemplateEdit();
      actorId = session.user.id;
    }

    const body = (await request.json().catch(() => ({}))) as {
      scheduleId?: string;
    };

    const delivery = await sendMonthlyBoardReport({
      actorId,
      scheduleId: body.scheduleId ?? null,
    });

    return NextResponse.json({ ok: true, delivery });
  } catch (error) {
    return reportingErrorResponse(error);
  }
}
