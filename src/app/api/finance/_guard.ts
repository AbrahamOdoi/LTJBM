import { NextResponse } from "next/server";
import {
  AuthGuardError,
  requireFinanceAccess,
  requireFinanceWrite,
} from "@/lib/auth-guards";
import { FinanceValidationError } from "@/lib/finance/service";
import {
  assertSameOriginMutation,
  SecurityGuardError,
} from "@/lib/security";

/** Shared HQ finance API gate — RecordsClerk, Board/Council, and other non-finance roles denied. */
export async function withFinanceAccess<T>(
  handler: () => Promise<T>,
  request?: Request,
): Promise<T | NextResponse> {
  try {
    if (request) assertSameOriginMutation(request);
    await requireFinanceAccess();
    return await handler();
  } catch (error) {
    return financeErrorResponse(error);
  }
}

/** Write gate — FinancialSecretary / Admin only. */
export async function withFinanceWrite<T>(
  handler: () => Promise<T>,
  request?: Request,
): Promise<T | NextResponse> {
  try {
    if (request) assertSameOriginMutation(request);
    await requireFinanceWrite();
    return await handler();
  } catch (error) {
    return financeErrorResponse(error);
  }
}

function financeErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthGuardError || error instanceof SecurityGuardError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof FinanceValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
