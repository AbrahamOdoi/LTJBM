"use server";

import type { GlAccountType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AuthGuardError,
  requireFinanceWrite,
} from "@/lib/auth-guards";
import {
  createBudget,
  createExpense,
  createGlAccount,
  createJournalEntry,
  GlValidationError,
  postJournalEntry,
  reconcilePaymentToIncome,
} from "@/lib/gl/service";

export type GlActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function isRedirectError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function parseMoney(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** HQ-only — Financial Secretary / Admin. Branch roles never reach here via guards. */
export async function createAccountAction(
  _prev: GlActionResult | null,
  formData: FormData,
): Promise<GlActionResult> {
  try {
    const session = await requireFinanceWrite();
    await createGlAccount({
      code: String(formData.get("code") || ""),
      name: String(formData.get("name") || ""),
      type: String(formData.get("type") || "Expense") as GlAccountType,
      description: String(formData.get("description") || "") || null,
      actorId: session.user.id,
    });
    revalidatePath("/finance/ledger");
    return { ok: true, message: "Account added to the chart." };
  } catch (error) {
    if (error instanceof AuthGuardError || error instanceof GlValidationError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create account",
    };
  }
}

export async function createJournalAction(
  _prev: GlActionResult | null,
  formData: FormData,
): Promise<GlActionResult> {
  try {
    const session = await requireFinanceWrite();
    const accountIds = formData.getAll("accountId").map(String);
    const debits = formData.getAll("debit");
    const credits = formData.getAll("credit");
    const lineMemos = formData.getAll("lineMemo");
    const lines = accountIds.map((accountId, i) => ({
      accountId,
      debit: parseMoney(debits[i]) || 0,
      credit: parseMoney(credits[i]) || 0,
      memo: String(lineMemos[i] || "") || null,
    })).filter((l) => l.accountId);

    const created = await createJournalEntry({
      entryDate: new Date(String(formData.get("entryDate") || "")),
      memo: String(formData.get("memo") || "") || null,
      reference: String(formData.get("reference") || "") || null,
      paymentId: String(formData.get("paymentId") || "") || null,
      obligationId: String(formData.get("obligationId") || "") || null,
      postImmediately: formData.get("postImmediately") === "on",
      lines,
      actorId: session.user.id,
    });
    revalidatePath("/finance/ledger");
    redirect(`/finance/ledger?highlight=${created.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthGuardError || error instanceof GlValidationError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create journal",
    };
  }
}

export async function postJournalAction(formData: FormData) {
  const session = await requireFinanceWrite();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await postJournalEntry(id, session.user.id);
  revalidatePath("/finance/ledger");
}

export async function createExpenseAction(
  _prev: GlActionResult | null,
  formData: FormData,
): Promise<GlActionResult> {
  try {
    const session = await requireFinanceWrite();
    await createExpense({
      expenseDate: new Date(String(formData.get("expenseDate") || "")),
      description: String(formData.get("description") || ""),
      amount: parseMoney(formData.get("amount")),
      accountId: String(formData.get("accountId") || ""),
      payFromAccountId: String(formData.get("payFromAccountId") || ""),
      vendor: String(formData.get("vendor") || "") || null,
      reference: String(formData.get("reference") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      actorId: session.user.id,
    });
    revalidatePath("/finance/expenses");
    revalidatePath("/finance/ledger");
    revalidatePath("/finance/budgets");
    return { ok: true, message: "Expense posted at Head Office." };
  } catch (error) {
    if (error instanceof AuthGuardError || error instanceof GlValidationError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to post expense",
    };
  }
}

export async function createBudgetAction(
  _prev: GlActionResult | null,
  formData: FormData,
): Promise<GlActionResult> {
  try {
    const session = await requireFinanceWrite();
    const accountIds = formData.getAll("lineAccountId").map(String);
    const amounts = formData.getAll("lineAmount");
    const lines = accountIds
      .map((accountId, i) => ({
        accountId,
        amount: parseMoney(amounts[i]) || 0,
      }))
      .filter((l) => l.accountId && l.amount >= 0);

    const fiscalYear = Number(String(formData.get("fiscalYear") || ""));
    const created = await createBudget({
      name: String(formData.get("name") || ""),
      fiscalYear,
      periodStart: new Date(String(formData.get("periodStart") || "")),
      periodEnd: new Date(String(formData.get("periodEnd") || "")),
      notes: String(formData.get("notes") || "") || null,
      lines,
      actorId: session.user.id,
    });
    revalidatePath("/finance/budgets");
    redirect(`/finance/budgets?id=${created.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthGuardError || error instanceof GlValidationError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create budget",
    };
  }
}

export async function reconcilePaymentAction(
  _prev: GlActionResult | null,
  formData: FormData,
): Promise<GlActionResult> {
  try {
    const session = await requireFinanceWrite();
    await reconcilePaymentToIncome({
      paymentId: String(formData.get("paymentId") || ""),
      incomeAccountId: String(formData.get("incomeAccountId") || ""),
      cashAccountId: String(formData.get("cashAccountId") || ""),
      actorId: session.user.id,
    });
    revalidatePath("/finance/ledger");
    return { ok: true, message: "Payment linked to the ledger (HQ only)." };
  } catch (error) {
    if (error instanceof AuthGuardError || error instanceof GlValidationError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to reconcile payment",
    };
  }
}
