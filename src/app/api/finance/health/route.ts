import { NextResponse } from "next/server";
import { withFinanceAccess } from "@/app/api/finance/_guard";
import { auth } from "@/auth";
import { canWriteFinance } from "@/lib/roles";

/**
 * Smoke endpoint for RBAC: reachable only with finance-capable roles.
 */
export async function GET() {
  return withFinanceAccess(async () => {
    const session = await auth();
    return NextResponse.json({
      ok: true,
      surface: "hq-finance",
      role: session?.user?.role,
      canWrite: canWriteFinance(session?.user?.role),
      endpoints: [
        "/api/finance/obligation-types",
        "/api/finance/members",
        "/api/finance/obligations",
        "/api/finance/payments",
        "/api/finance/batches",
        "/api/finance/arrears",
        "/api/finance/balances",
      ],
    });
  });
}
