import { NextResponse } from "next/server";
import { getGivingProviderStatuses } from "@/lib/giving/service";

export async function GET() {
  const providers = await getGivingProviderStatuses();
  return NextResponse.json({ providers });
}
