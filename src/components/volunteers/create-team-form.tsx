"use client";

import { useActionState } from "react";
import {
  createTeamAction,
  type VolunteerActionResult,
} from "@/lib/volunteers/actions";

const KINDS = [
  "Usher",
  "Worship",
  "Hospitality",
  "Kids",
  "Media",
  "Parking",
  "Security",
  "Other",
] as const;

export function CreateTeamForm({
  branches,
}: {
  branches: Array<{ id: string; name: string; code: string }>;
}) {
  const [state, action, pending] = useActionState<
    VolunteerActionResult | null,
    FormData
  >(createTeamAction, null);

  return (
    <form action={action} className="lt-panel max-w-xl space-y-4 p-5">
      <label className="block text-sm">
        Team name
        <input
          name="name"
          required
          placeholder="e.g. Sunday ushers"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Kind
        <select
          name="kind"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue="Usher"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Branch (optional)
        <select
          name="branchId"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue=""
        >
          <option value="">All branches / HQ</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Description
        <textarea
          name="description"
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
      ) : null}
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Creating…" : "Create team"}
      </button>
    </form>
  );
}
