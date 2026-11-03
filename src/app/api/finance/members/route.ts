import { NextRequest, NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { listFinanceMembers } from "@/lib/finance/service";

/** Minimal member lookup for HQ finance entry forms (not biodata CRUD). */
export async function GET(request: NextRequest) {
  return withFinanceAccess(async () => {
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const members = await listFinanceMembers(q);
    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        memberNumber: m.memberNumber,
        branchId: m.branchId,
      })),
    });
  });
}
