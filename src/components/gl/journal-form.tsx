"use client";

import { useActionState } from "react";
import { createJournalAction, type GlActionResult } from "@/lib/gl/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

type AccountOpt = { id: string; label: string };

export function JournalForm({ accounts }: { accounts: AccountOpt[] }) {
  const [state, formAction, pending] = useActionState(
    createJournalAction,
    null as GlActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-4 p-5">
      <h3 className="text-sm font-medium">New journal entry</h3>
      <p className="text-xs text-[var(--lt-muted)]">
        Double-entry: debits must equal credits. HQ Financial Secretary / Admin
        only — never branch posting.
      </p>
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          Date
          <input
            type="date"
            name="entryDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Reference
          <input name="reference" className={inputClass} />
        </label>
      </div>
      <label className="block text-sm">
        Memo
        <input name="memo" className={inputClass} />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Lines
        </p>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid gap-2 rounded-md border border-[var(--lt-line)] p-3 sm:grid-cols-4"
          >
            <label className="block text-sm sm:col-span-2">
              Account
              <select name="accountId" className={inputClass} defaultValue="">
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Debit
              <input name="debit" inputMode="decimal" className={inputClass} />
            </label>
            <label className="block text-sm">
              Credit
              <input name="credit" inputMode="decimal" className={inputClass} />
            </label>
            <input type="hidden" name="lineMemo" value="" />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="postImmediately"
          defaultChecked
          className="rounded border-slate-300"
        />
        Post immediately
      </label>

      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Saving…" : "Save journal"}
      </button>
    </form>
  );
}
