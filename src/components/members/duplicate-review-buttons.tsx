"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/members/actions";

export function DuplicateReviewButtons({
  candidateId,
  action,
}: {
  candidateId: string;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="candidateId" value={candidateId} />
          <input type="hidden" name="status" value="ConfirmedDuplicate" />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-60"
          >
            Confirm duplicate
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="candidateId" value={candidateId} />
          <input type="hidden" name="status" value="Dismissed" />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-60"
          >
            Dismiss
          </button>
        </form>
      </div>
      {state && !state.ok ? (
        <p className="text-xs text-rose-700">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-emerald-700">Saved.</p>
      ) : null}
    </div>
  );
}
