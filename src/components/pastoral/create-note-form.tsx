"use client";

import { useActionState } from "react";
import {
  createPastoralNoteAction,
  type PastoralActionResult,
} from "@/lib/pastoral/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

export function CreatePastoralNoteForm() {
  const [state, formAction, pending] = useActionState(
    createPastoralNoteAction,
    null as PastoralActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel h-fit space-y-3 p-4">
      <h3 className="text-sm font-medium">New note</h3>
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">Saved.</p>
      ) : null}
      <label className="block text-sm">
        Kind
        <select name="kind" className={inputClass} defaultValue="Prayer">
          <option value="Prayer">Prayer</option>
          <option value="Visitation">Visitation</option>
          <option value="Counselling">Counselling</option>
          <option value="Wedding">Wedding</option>
          <option value="Funeral">Funeral</option>
          <option value="Dedication">Dedication</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label className="block text-sm">
        Title
        <input name="title" required className={inputClass} />
      </label>
      <label className="block text-sm">
        Notes
        <textarea name="body" required rows={5} className={inputClass} />
      </label>
      <label className="block text-sm">
        Date
        <input
          type="date"
          name="occurredOn"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        Member id (optional)
        <input
          name="memberId"
          placeholder="Paste member id if linking"
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPrivate" value="true" defaultChecked />
        Restricted (default)
      </label>
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}
