"use client";

import { useActionState } from "react";
import { createAccountAction, type GlActionResult } from "@/lib/gl/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

export function AccountForm() {
  const [state, formAction, pending] = useActionState(
    createAccountAction,
    null as GlActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-3 p-4">
      <h3 className="text-sm font-medium">Add account</h3>
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
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          Code
          <input name="code" required className={inputClass} placeholder="5400" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Name
          <input name="name" required className={inputClass} />
        </label>
      </div>
      <label className="block text-sm">
        Type
        <select name="type" defaultValue="Expense" className={inputClass}>
          <option value="Asset">Asset</option>
          <option value="Liability">Liability</option>
          <option value="Equity">Equity</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="lt-btn-secondary">
        {pending ? "Saving…" : "Add to chart"}
      </button>
    </form>
  );
}
