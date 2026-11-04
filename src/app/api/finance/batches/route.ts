import { NextRequest, NextResponse } from "next/server";
import {
  withFinanceAccess,
  withFinanceWrite,
} from "@/app/api/finance/_guard";
import { requireFinanceWrite } from "@/lib/auth-guards";
import { parsePageParams } from "@/lib/data-table";
import {
  createCollectionBatch,
  listCollectionBatches,
} from "@/lib/finance/service";

export async function GET(request: NextRequest) {
  return withFinanceAccess(async () => {
    const params = request.nextUrl.searchParams;
    const { page, pageSize } = parsePageParams({
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
    });
    const listed = await listCollectionBatches({
      q: params.get("q") ?? undefined,
      variance: params.get("variance") ?? undefined,
      page,
      pageSize,
    });
    return NextResponse.json({
      batches: listed.items,
      total: listed.total,
      page: listed.page,
      pageSize: listed.pageSize,
      pageCount: listed.pageCount,
    });
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
