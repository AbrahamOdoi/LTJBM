import { GroupKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { parsePageParams } from "@/lib/data-table";
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
    const { page, pageSize } = parsePageParams({
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
    });
    const listed = await listDuesArrears({
      memberId: params.get("memberId") ?? undefined,
      cellId: params.get("cellId") ?? undefined,
      fellowshipMinistryId: params.get("fellowshipMinistryId") ?? undefined,
      groupKind: parseGroupKind(params.get("groupKind")),
      q: params.get("q") ?? undefined,
      periodStart: params.get("periodStart")
        ? new Date(params.get("periodStart")!)
        : undefined,
      periodEnd: params.get("periodEnd")
        ? new Date(params.get("periodEnd")!)
        : undefined,
      page,
      pageSize,
    });
    return NextResponse.json({
      arrears: listed.items,
      count: listed.total,
      total: listed.total,
      page: listed.page,
      pageSize: listed.pageSize,
      pageCount: listed.pageCount,
    });
  });
}
