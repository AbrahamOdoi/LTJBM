import { ObligationKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { getBalanceRollup } from "@/lib/finance/service";

/**
 * Expected / Paid / Outstanding aggregates for Reporting to consume.
 * Finance owns the write path; this endpoint is the read contract.
 */
export async function GET(request: NextRequest) {
  return withFinanceAccess(async () => {
    const params = request.nextUrl.searchParams;
    const kindParam = params.get("kind");
    const kind =
      kindParam &&
      (Object.values(ObligationKind) as string[]).includes(kindParam)
        ? (kindParam as ObligationKind)
        : undefined;

    const rollup = await getBalanceRollup({
      kind,
      periodStart: params.get("periodStart")
        ? new Date(params.get("periodStart")!)
        : undefined,
      periodEnd: params.get("periodEnd")
        ? new Date(params.get("periodEnd")!)
        : undefined,
    });

    return NextResponse.json(rollup);
  });
}
