import { NextResponse } from "next/server";
import { withReportingAccess } from "@/app/api/reports/_guard";
import {
  ensureDefaultBoardTemplate,
  listReportSchedules,
} from "@/lib/reporting/service";

export async function GET() {
  return withReportingAccess(async () => {
    await ensureDefaultBoardTemplate();
    const schedules = await listReportSchedules();
    return NextResponse.json({ schedules });
  });
}
