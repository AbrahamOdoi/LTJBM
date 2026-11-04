"use client";

import { useActionState } from "react";
import {
  createGroupAction,
  type GroupActionResult,
} from "@/lib/groups/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

const KINDS = [
  { value: "Cell", label: "Cell" },
  { value: "Fellowship", label: "Fellowship" },
  { value: "Choir", label: "Choir" },
  { value: "Usher", label: "Ushers" },
  { value: "Youth", label: "Youth" },
  { value: "Department", label: "Department" },
  { value: "Other", label: "Other" },
] as const;

export function CreateGroupForm({
  branches,
}: {
  branches: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createGroupAction,
    null as GroupActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-4 p-5">
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <label className="block text-sm">
        Name
        <input name="name" required className={inputClass} />
      </label>

      <label className="block text-sm">
        Kind
        <select name="kind" className={inputClass} defaultValue="Department">
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        Branch
        <select name="branchId" className={inputClass} defaultValue="">
          <option value="">HQ / all branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-[var(--lt-muted)]">
          Required for cells. Fellowship ministries may be HQ-wide.
        </span>
      </label>

      <label className="block text-sm">
        Description
        <textarea name="description" rows={3} className={inputClass} />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="linkLegacy"
          value="true"
          defaultChecked
          className="mt-1"
        />
        <span>
          Link cell / fellowship to existing membership &amp; contributions
          filters when kind is Cell or Fellowship.
        </span>
      </label>

      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
