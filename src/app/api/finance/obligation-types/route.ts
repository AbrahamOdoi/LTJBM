import { NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { listObligationTypes } from "@/lib/finance/service";

export async function GET() {
  return withFinanceAccess(async () => {
    const types = await listObligationTypes();
    return NextResponse.json({ types });
  });
}
