"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/members/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

type BranchOption = { id: string; label: string };

export function StatusChangeForm({
  memberId,
  currentStatus,
  action,
}: {
  memberId: string;
  currentStatus: string;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-4">
      <input type="hidden" name="memberId" value={memberId} />
      <h3 className="text-sm font-medium text-slate-800">Change status</h3>
      <p className="text-xs text-slate-500">Current: {currentStatus}</p>
      <label className="block text-sm">
        New status
        <select name="toStatus" required className={inputClass} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {[
            "Active",
            "Visitor",
            "Inactive",
            "Transferred",
            "Deceased",
            "Suspended",
          ]
            .filter((s) => s !== currentStatus)
            .map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
        </select>
      </label>
      <label className="block text-sm">
        Reason
        <textarea name="reason" rows={2} className={inputClass} />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-rose-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">Status updated.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update status"}
      </button>
    </form>
  );
}

export function BranchTransferForm({
  memberId,
  currentBranchId,
  branches,
  action,
}: {
  memberId: string;
  currentBranchId: string;
  branches: BranchOption[];
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const destinations = branches.filter((b) => b.id !== currentBranchId);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-4">
      <input type="hidden" name="memberId" value={memberId} />
      <h3 className="text-sm font-medium text-slate-800">Branch transfer</h3>
      <p className="text-xs text-slate-500">
        Supports Ghana → international transfers; cell memberships end on transfer.
      </p>
      <label className="block text-sm">
        Destination branch
        <select name="toBranchId" required className={inputClass} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {destinations.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Reason
        <textarea name="reason" rows={2} className={inputClass} />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-rose-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">
          {state.warning ?? "Transfer recorded."}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || destinations.length === 0}
        className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Transferring…" : "Transfer member"}
      </button>
    </form>
  );
}
