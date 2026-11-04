import { NextResponse } from "next/server";
import { AuthGuardError, requireAttendanceAccess } from "@/lib/auth-guards";
import { searchMembersForAttendance } from "@/lib/attendance/service";

export async function GET(request: Request) {
  try {
    await requireAttendanceAccess();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const branchId = searchParams.get("branchId") ?? undefined;
    if (q.length < 2) {
      return NextResponse.json({ members: [] });
    }
    const members = await searchMembersForAttendance(q, branchId);
    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
