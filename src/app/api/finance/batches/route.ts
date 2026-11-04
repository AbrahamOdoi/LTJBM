import { NextRequest, NextResponse } from "next/server";
import {
  withFinanceAccess,
  withFinanceWrite,
} from "@/app/api/finance/_guard";
import { requireFinanceWrite } from "@/lib/auth-guards";
import {
  createCollectionBatch,
  listCollectionBatches,
} from "@/lib/finance/service";

export async function GET() {
  return withFinanceAccess(async () => {
    const batches = await listCollectionBatches();
    return NextResponse.json({ batches });
  });
}

export async function POST(request: NextRequest) {
  return withFinanceWrite(async () => {
    const session = await requireFinanceWrite();
    const body = await request.json();

    const batch = await createCollectionBatch({
      batchDate: new Date(body.batchDate),
      label: String(body.label ?? "Saturday collection"),
      countedTotal: Number(body.countedTotal),
      notes: body.notes ?? null,
      actorId: session.user.id,
    });

    return NextResponse.json({ batch }, { status: 201 });
  }, request);
}
