"use client";

import { useActionState } from "react";
import {
  reconcilePaymentAction,
  type GlActionResult,
} from "@/lib/gl/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

type AccountOpt = { id: string; label: string };
type PaymentOpt = { id: string; label: string };

export function ReconcilePaymentForm({
  payments,
  incomeAccounts,
  cashAccounts,
}: {
  payments: PaymentOpt[];
  incomeAccounts: AccountOpt[];
  cashAccounts: AccountOpt[];
}) {
  const [state, formAction, pending] = useActionState(
    reconcilePaymentAction,
    null as GlActionResult | null,
  );

  if (payments.length === 0) {
    return (
      <p className="lt-panel p-4 text-sm text-[var(--lt-muted)]">
        No unreconciled contribution payments ready to link.
      </p>
    );
  }

  return (
    <form action={formAction} className="lt-panel space-y-3 p-4">
      <h3 className="text-sm font-medium">Reconcile contribution → ledger</h3>
      <p className="text-xs text-[var(--lt-muted)]">
        Links a HQ payment id to a posted income journal. Board reports never
        receive giver names from this path — aggregates only.
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
      <label className="block text-sm">
        Payment
        <select name="paymentId" required className={inputClass}>
          {payments.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Income account
        <select name="incomeAccountId" required className={inputClass}>
          {incomeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Cash / bank account
        <select name="cashAccountId" required className={inputClass}>
          {cashAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="lt-btn-secondary">
        {pending ? "Linking…" : "Reconcile to GL"}
      </button>
    </form>
  );
}
