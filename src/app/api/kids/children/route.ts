import { NextResponse } from "next/server";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import { searchChildren } from "@/lib/kids/service";

export async function GET(request: Request) {
  try {
    await requireAttendanceAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const branchId = searchParams.get("branchId") || undefined;
  if (q.length < 2) {
    return NextResponse.json({ children: [] });
  }

  const children = await searchChildren(q, branchId);
  return NextResponse.json({ children });
}
