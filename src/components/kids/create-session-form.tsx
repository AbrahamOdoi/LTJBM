"use client";

import { useActionState } from "react";
import {
  createKidsSessionAction,
  type KidsActionResult,
} from "@/lib/kids/actions";

type Branch = { id: string; name: string; code: string };
type Room = { id: string; name: string; branchId: string | null };
type AttSession = { id: string; label: string; heldAt: string };

export function CreateKidsSessionForm({
  branches,
  rooms,
  attendanceSessions,
}: {
  branches: Branch[];
  rooms: Room[];
  attendanceSessions: AttSession[];
}) {
  const [state, action, pending] = useActionState<
    KidsActionResult | null,
    FormData
  >(createKidsSessionAction, null);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="lt-panel max-w-xl space-y-4 p-5">
      <label className="block text-sm">
        Label
        <input
          name="label"
          required
          defaultValue="Sunday children’s church"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Date
        <input
          type="date"
          name="heldAt"
          required
          defaultValue={today}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Branch
        <select
          name="branchId"
          required
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={branches[0]?.id}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Classroom (optional)
        <select
          name="roomId"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue=""
        >
          <option value="">Any / assign later</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Link adult attendance session (optional)
        <select
          name="attendanceSessionId"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue=""
        >
          <option value="">None</option>
          {attendanceSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.heldAt} · {s.label}
            </option>
          ))}
        </select>
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
        {pending ? "Creating…" : "Create session"}
      </button>
    </form>
  );
}
