import { NextRequest, NextResponse } from "next/server";
import {
  withFinanceAccess,
  withFinanceWrite,
} from "@/app/api/finance/_guard";
import { requireFinanceWrite } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { serializePayment } from "@/lib/finance/serializers";
import { createPayment } from "@/lib/finance/service";

export async function GET(request: NextRequest) {
  return withFinanceAccess(async () => {
    const obligationId = request.nextUrl.searchParams.get("obligationId");
    const batchId = request.nextUrl.searchParams.get("batchId");
    const payments = await prisma.payment.findMany({
      where: {
        obligationId: obligationId ?? undefined,
        batchId: batchId ?? undefined,
      },
      orderBy: { paidAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      payments: payments.map(serializePayment),
    });
  });
}

export async function POST(request: NextRequest) {
  return withFinanceWrite(async () => {
    const session = await requireFinanceWrite();
    const body = await request.json();

    const payment = await createPayment({
      obligationId: String(body.obligationId),
      amount: Number(body.amount),
      paidAt: new Date(body.paidAt),
      method: body.method ?? null,
      reference: body.reference ?? null,
      notes: body.notes ?? null,
      batchId: body.batchId ?? null,
      actorId: session.user.id,
    });

    return NextResponse.json({ payment }, { status: 201 });
  });
}
