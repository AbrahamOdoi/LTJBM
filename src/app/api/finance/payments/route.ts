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
    const params = request.nextUrl.searchParams;
    const obligationId = params.get("obligationId");
    const batchId = params.get("batchId");
    const q = params.get("q")?.trim();
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(params.get("pageSize") ?? "25", 10) || 25),
    );
    const where = {
      obligationId: obligationId ?? undefined,
      batchId: batchId ?? undefined,
      ...(q
        ? {
            OR: [
              { reference: { contains: q, mode: "insensitive" as const } },
              { method: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);
    return NextResponse.json({
      payments: payments.map(serializePayment),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize) || 1),
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
  }, request);
}
