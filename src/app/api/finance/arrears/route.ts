import { GroupKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { listDuesArrears } from "@/lib/finance/service";

function parseGroupKind(value: string | null): GroupKind | undefined {
  if (!value) return undefined;
  if ((Object.values(GroupKind) as string[]).includes(value)) {
    return value as GroupKind;
  }
  return undefined;
}

/** Dues arrears by member / group / period. */
export async function GET(request: NextRequest) {
  return withFinanceAccess(async () => {
    const params = request.nextUrl.searchParams;
    const arrears = await listDuesArrears({
      memberId: params.get("memberId") ?? undefined,
      cellId: params.get("cellId") ?? undefined,
      fellowshipMinistryId: params.get("fellowshipMinistryId") ?? undefined,
      groupKind: parseGroupKind(params.get("groupKind")),
      periodStart: params.get("periodStart")
        ? new Date(params.get("periodStart")!)
        : undefined,
      periodEnd: params.get("periodEnd")
        ? new Date(params.get("periodEnd")!)
        : undefined,
    });
    return NextResponse.json({ arrears, count: arrears.length });
  });
}
