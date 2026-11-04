import { NextResponse } from "next/server";
import { AuthGuardError, requireFinanceAccess } from "@/lib/auth-guards";

/** Shared HQ finance API gate — RecordsClerk and other non-finance roles are denied. */
export async function withFinanceAccess<T>(
  handler: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    await requireFinanceAccess();
    return await handler();
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
