"use client";

import { useActionState } from "react";
import {
  createServiceAction,
  type VolunteerActionResult,
} from "@/lib/volunteers/actions";

export function CreateServiceForm({
  branches,
}: {
  branches: Array<{ id: string; name: string; code: string }>;
}) {
  const [state, action, pending] = useActionState<
    VolunteerActionResult | null,
    FormData
  >(createServiceAction, null);

  const defaultStart = new Date();
  defaultStart.setUTCHours(9, 0, 0, 0);
  if (defaultStart.getTime() < Date.now()) {
    defaultStart.setDate(defaultStart.getDate() + ((7 - defaultStart.getDay()) % 7 || 7));
  }
  const startValue = defaultStart.toISOString().slice(0, 16);

  return (
    <form action={action} className="lt-panel max-w-xl space-y-4 p-5">
      <label className="block text-sm">
        Service label
        <input
          name="label"
          required
          defaultValue="Sunday worship"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Starts
        <input
          type="datetime-local"
          name="startsAt"
          required
          defaultValue={startValue}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Ends (optional)
        <input
          type="datetime-local"
          name="endsAt"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Branch
        <select
          name="branchId"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={branches[0]?.id ?? ""}
        >
          <option value="">—</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Location
        <input
          name="location"
          placeholder="Main sanctuary"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Notes
        <textarea
          name="notes"
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
      ) : null}
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Creating…" : "Create schedule"}
      </button>
    </form>
  );
}
