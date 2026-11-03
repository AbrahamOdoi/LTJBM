import { NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { auth } from "@/auth";

/**
 * Smoke endpoint for RBAC: reachable only with finance-capable roles.
 * Finance workstream will replace with real obligation/payment APIs.
 */
export async function GET() {
  return withFinanceAccess(async () => {
    const session = await auth();
    return NextResponse.json({
      ok: true,
      surface: "hq-finance",
      role: session?.user?.role,
      message: "Finance API gate open for this role.",
    });
  });
}
