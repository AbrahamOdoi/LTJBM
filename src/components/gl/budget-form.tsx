"use client";

import { useActionState } from "react";
import { createBudgetAction, type GlActionResult } from "@/lib/gl/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

type AccountOpt = { id: string; label: string };

export function BudgetForm({ accounts }: { accounts: AccountOpt[] }) {
  const year = new Date().getFullYear();
  const [state, formAction, pending] = useActionState(
    createBudgetAction,
    null as GlActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-4 p-5">
      <h3 className="text-sm font-medium">New budget</h3>
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          Name
          <input
            name="name"
            required
            defaultValue={`Ministry budget ${year}`}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Fiscal year
          <input
            name="fiscalYear"
            type="number"
            required
            defaultValue={year}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Period start
          <input
            type="date"
            name="periodStart"
            required
            defaultValue={`${year}-01-01`}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Period end
          <input
            type="date"
            name="periodEnd"
            required
            defaultValue={`${year}-12-31`}
            className={inputClass}
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Lines (account + amount)
        </p>
        {accounts.slice(0, 6).map((a) => (
          <div key={a.id} className="grid gap-2 sm:grid-cols-[1fr_120px]">
            <input type="hidden" name="lineAccountId" value={a.id} />
            <p className="self-center text-sm text-[var(--lt-ink)]">{a.label}</p>
            <input
              name="lineAmount"
              inputMode="decimal"
              defaultValue="0"
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Saving…" : "Create budget"}
      </button>
    </form>
  );
}
