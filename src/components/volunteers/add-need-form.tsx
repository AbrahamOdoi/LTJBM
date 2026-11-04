"use client";

import { useActionState } from "react";
import {
  addNeedAction,
  type VolunteerActionResult,
} from "@/lib/volunteers/actions";

type RoleOption = {
  id: string;
  name: string;
  defaultSlots: number;
  team: { name: string; kind: string };
};

export function AddNeedForm({
  serviceId,
  roles,
}: {
  serviceId: string;
  roles: RoleOption[];
}) {
  const [state, action, pending] = useActionState<
    VolunteerActionResult | null,
    FormData
  >(addNeedAction, null);

  return (
    <form action={action} className="lt-panel space-y-3 p-4">
      <input type="hidden" name="serviceId" value={serviceId} />
      <h3 className="text-sm font-medium text-[var(--lt-ink)]">
        Add role need
      </h3>
      <label className="block text-sm">
        Role
        <select
          name="roleId"
          required
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue=""
        >
          <option value="" disabled>
            Select…
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.team.name} · {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Slots needed
        <input
          type="number"
          name="slotsNeeded"
          min={1}
          defaultValue={2}
          className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
      ) : null}
      {state && state.ok ? (
        <p className="text-sm text-[var(--lt-ok)]">{state.message}</p>
      ) : null}
      <button type="submit" disabled={pending} className="lt-btn-secondary">
        {pending ? "Adding…" : "Add to service"}
      </button>
    </form>
  );
}
