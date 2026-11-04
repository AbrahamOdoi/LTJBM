"use client";

import { useActionState } from "react";
import {
  createSeriesAction,
  type MediaActionResult,
} from "@/lib/media/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

export function SeriesForm() {
  const [state, formAction, pending] = useActionState(
    createSeriesAction,
    null as MediaActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-3 p-4">
      <h3 className="text-sm font-medium text-[var(--lt-ink)]">New series</h3>
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
        Name
        <input name="name" required className={inputClass} />
      </label>
      <label className="block text-sm">
        Description
        <input name="description" className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className="lt-btn-secondary">
        {pending ? "Saving…" : "Add series"}
      </button>
    </form>
  );
}
