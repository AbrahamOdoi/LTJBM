import { NextResponse } from "next/server";
import {
  AuthGuardError,
  requireFinanceAccess,
  requireFinanceWrite,
} from "@/lib/auth-guards";
import { FinanceValidationError } from "@/lib/finance/service";

/** Shared HQ finance API gate — RecordsClerk and other non-finance roles are denied. */
export async function withFinanceAccess<T>(
  handler: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    await requireFinanceAccess();
    return await handler();
  } catch (error) {
    return financeErrorResponse(error);
  }
}

/** Write gate — FinancialSecretary / Admin only. */
export async function withFinanceWrite<T>(
  handler: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    await requireFinanceWrite();
    return await handler();
  } catch (error) {
    return financeErrorResponse(error);
  }
}

function financeErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthGuardError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof FinanceValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
