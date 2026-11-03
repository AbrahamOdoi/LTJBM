import { ObligationKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  withFinanceAccess,
  withFinanceWrite,
} from "@/app/api/finance/_guard";
import { requireFinanceWrite } from "@/lib/auth-guards";
import {
  createObligation,
  listObligations,
} from "@/lib/finance/service";

function parseKind(value: string | null): ObligationKind | undefined {
  if (!value) return undefined;
  if ((Object.values(ObligationKind) as string[]).includes(value)) {
    return value as ObligationKind;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  return withFinanceAccess(async () => {
    const params = request.nextUrl.searchParams;
    const obligations = await listObligations({
      kind: parseKind(params.get("kind")),
      memberId: params.get("memberId") ?? undefined,
      periodStart: params.get("periodStart")
        ? new Date(params.get("periodStart")!)
        : undefined,
      periodEnd: params.get("periodEnd")
        ? new Date(params.get("periodEnd")!)
        : undefined,
    });
    return NextResponse.json({ obligations });
  });
}

export async function POST(request: NextRequest) {
  return withFinanceWrite(async () => {
    const session = await requireFinanceWrite();
    const body = await request.json();

    const obligation = await createObligation({
      memberId: String(body.memberId),
      obligationTypeId: String(body.obligationTypeId),
      fellowshipMinistryId: body.fellowshipMinistryId ?? null,
      periodStart: new Date(body.periodStart),
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
      expectedAmount: Number(body.expectedAmount),
      currency: body.currency ?? "GHS",
      instalmentCount:
        body.instalmentCount == null ? null : Number(body.instalmentCount),
      projectTargetAmount:
        body.projectTargetAmount == null
          ? null
          : Number(body.projectTargetAmount),
      notes: body.notes ?? null,
      actorId: session.user.id,
    });

    return NextResponse.json({ obligation }, { status: 201 });
  });
}
