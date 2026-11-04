import { NextResponse } from "next/server";
import { AuthGuardError, requireGroupsAccess } from "@/lib/auth-guards";
import { searchMembersForGroups } from "@/lib/groups/service";

export async function GET(request: Request) {
  try {
    await requireGroupsAccess();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const branchId = searchParams.get("branchId") ?? undefined;
    const members = await searchMembersForGroups(q, branchId || undefined);
    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
