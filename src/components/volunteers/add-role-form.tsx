"use client";

import { useActionState } from "react";
import {
  addRoleAction,
  type VolunteerActionResult,
} from "@/lib/volunteers/actions";

export function AddRoleForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState<
    VolunteerActionResult | null,
    FormData
  >(addRoleAction, null);

  return (
    <form action={action} className="lt-panel space-y-3 p-4">
      <input type="hidden" name="teamId" value={teamId} />
      <h3 className="text-sm font-medium text-[var(--lt-ink)]">Add role</h3>
      <label className="block text-sm">
        Role name
        <input
          name="name"
          required
          placeholder="e.g. Door greeter"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Default slots
        <input
          type="number"
          name="defaultSlots"
          min={1}
          defaultValue={2}
          className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Description
        <input
          name="description"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
      ) : null}
      {state && state.ok ? (
        <p className="text-sm text-[var(--lt-ok)]">{state.message}</p>
      ) : null}
      <button type="submit" disabled={pending} className="lt-btn-secondary">
        {pending ? "Adding…" : "Add role"}
      </button>
    </form>
  );
}
