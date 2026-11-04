"use client";

import { useActionState } from "react";
import { createExpenseAction, type GlActionResult } from "@/lib/gl/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

type AccountOpt = { id: string; label: string };

export function ExpenseForm({
  expenseAccounts,
  assetAccounts,
}: {
  expenseAccounts: AccountOpt[];
  assetAccounts: AccountOpt[];
}) {
  const [state, formAction, pending] = useActionState(
    createExpenseAction,
    null as GlActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-4 p-5">
      <h3 className="text-sm font-medium text-[var(--lt-ink)]">
        Post expense (Head Office)
      </h3>
      <p className="text-xs text-[var(--lt-muted)]">
        Creates a posted journal: debit expense, credit cash/bank. Branch
        treasurers cannot post — Financial Secretary / Admin only.
      </p>
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Date
          <input
            type="date"
            name="expenseDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Amount (GHS)
          <input
            name="amount"
            required
            inputMode="decimal"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm">
        Description
        <input name="description" required className={inputClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Expense account
          <select name="accountId" required className={inputClass}>
            <option value="">Select…</option>
            {expenseAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Pay from (cash/bank)
          <select name="payFromAccountId" required className={inputClass}>
            <option value="">Select…</option>
            {assetAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Vendor
          <input name="vendor" className={inputClass} />
        </label>
        <label className="block text-sm">
          Reference
          <input name="reference" className={inputClass} />
        </label>
      </div>

      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Posting…" : "Post expense"}
      </button>
    </form>
  );
}
