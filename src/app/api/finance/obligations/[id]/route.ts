import { NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { getObligation } from "@/lib/finance/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return withFinanceAccess(async () => {
    const { id } = await params;
    const obligation = await getObligation(id);
    if (!obligation) {
      return NextResponse.json({ error: "Obligation not found" }, { status: 404 });
    }
    return NextResponse.json({ obligation });
  });
}
