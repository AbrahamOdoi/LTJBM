import { NextResponse } from "next/server";
import { requireVolunteersAccess } from "@/lib/auth-guards";
import { searchMembersForVolunteers } from "@/lib/volunteers/service";

export async function GET(request: Request) {
  try {
    await requireVolunteersAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const branchId = searchParams.get("branchId") || undefined;
  if (q.length < 2) {
    return NextResponse.json({ members: [] });
  }

  const members = await searchMembersForVolunteers(q, branchId);
  return NextResponse.json({ members });
}
