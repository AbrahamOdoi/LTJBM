import { NextRequest, NextResponse } from "next/server";
import {
  withFinanceAccess,
  withFinanceWrite,
} from "@/app/api/finance/_guard";
import { requireFinanceWrite } from "@/lib/auth-guards";
import {
  getCollectionBatch,
  updateCollectionBatch,
} from "@/lib/finance/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withFinanceAccess(async () => {
    const { id } = await params;
    const batch = await getCollectionBatch(id);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json({ batch });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withFinanceWrite(async () => {
    const session = await requireFinanceWrite();
    const { id } = await params;
    const body = await request.json();

    const batch = await updateCollectionBatch(id, {
      countedTotal:
        body.countedTotal == null ? undefined : Number(body.countedTotal),
      label: body.label == null ? undefined : String(body.label),
      notes: body.notes,
      actorId: session.user.id,
    });

    return NextResponse.json({ batch });
  }, request);
}
