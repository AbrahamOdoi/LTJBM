"use client";

import { useActionState } from "react";
import {
  createEventAction,
  type EventActionResult,
} from "@/lib/events/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

export function CreateEventForm({
  branches,
}: {
  branches: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createEventAction,
    null as EventActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-4 p-5">
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <label className="block text-sm">
        Title
        <input name="title" required className={inputClass} />
      </label>
      <label className="block text-sm">
        Description
        <textarea name="description" rows={3} className={inputClass} />
      </label>
      <label className="block text-sm">
        Starts
        <input type="datetime-local" name="startsAt" required className={inputClass} />
      </label>
      <label className="block text-sm">
        Ends (optional)
        <input type="datetime-local" name="endsAt" className={inputClass} />
      </label>
      <label className="block text-sm">
        Location
        <input name="location" className={inputClass} />
      </label>
      <label className="block text-sm">
        Branch (optional)
        <select name="branchId" className={inputClass} defaultValue="">
          <option value="">All / HQ</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Capacity (optional)
        <input type="number" name="capacity" min={1} className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Saving…" : "Create event"}
      </button>
    </form>
  );
}
