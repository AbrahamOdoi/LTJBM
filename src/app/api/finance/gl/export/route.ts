import { NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { exportPostedJournalCsv } from "@/lib/gl/service";

/** HQ CSV export of posted journal lines — account aggregates, no giver names. */
export async function GET(request: Request) {
  return withFinanceAccess(async () => {
    const url = new URL(request.url);
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    const csv = await exportPostedJournalCsv({
      from: fromRaw ? new Date(fromRaw) : undefined,
      to: toRaw ? new Date(toRaw) : undefined,
    });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="ltjbm-gl-posted.csv"',
      },
    });
  });
}
