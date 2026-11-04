"use client";

import { useActionState } from "react";
import {
  createMeetingAction,
  type GroupActionResult,
} from "@/lib/groups/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

export function GroupMeetingForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(
    createMeetingAction,
    null as GroupActionResult | null,
  );

  return (
    <form action={formAction} className="space-y-3 border-t border-[var(--lt-line)] pt-4">
      <input type="hidden" name="groupId" value={groupId} />
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {state.message}
        </p>
      ) : null}
      <label className="block text-sm">
        Title
        <input name="title" required className={inputClass} placeholder="Weekday meeting" />
      </label>
      <label className="block text-sm">
        Date
        <input type="date" name="heldAt" required className={inputClass} />
      </label>
      <label className="block text-sm">
        Location
        <input name="location" className={inputClass} />
      </label>
      <label className="block text-sm">
        Headcount
        <input type="number" name="attendanceCount" min={0} className={inputClass} />
      </label>
      <label className="block text-sm">
        Notes
        <textarea name="notes" rows={3} className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Saving…" : "Log meeting"}
      </button>
    </form>
  );
}
