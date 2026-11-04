"use client";

import { useActionState } from "react";
import {
  createBookingAction,
  createRoomAction,
  type FacilityActionResult,
} from "@/lib/facilities/actions";

const initial: FacilityActionResult | null = null;

export function CreateRoomForm({
  branches,
}: {
  branches: Array<{ id: string; label: string }>;
}) {
  const [state, action, pending] = useActionState(createRoomAction, initial);

  return (
    <form action={action} className="lt-panel max-w-xl space-y-4 p-5">
      {state && !state.ok ? (
        <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
      ) : null}
      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Room name</span>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="Main sanctuary"
        />
      </label>
      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Code (optional)</span>
        <input
          name="code"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="SANCT"
        />
      </label>
      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Branch</span>
        <select
          name="branchId"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          defaultValue=""
        >
          <option value="">All / HQ shared</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Capacity</span>
          <input
            name="capacity"
            type="number"
            min={0}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Location</span>
          <input
            name="location"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="Ground floor"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Notes</span>
        <textarea
          name="notes"
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <button type="submit" disabled={pending} className="lt-btn-primary disabled:opacity-60">
        {pending ? "Saving…" : "Save room"}
      </button>
    </form>
  );
}

export function CreateBookingForm({
  roomId,
  events,
}: {
  roomId: string;
  events: Array<{ id: string; label: string }>;
}) {
  const [state, action, pending] = useActionState(createBookingAction, initial);

  return (
    <form action={action} className="lt-panel space-y-4 p-5">
      <h3 className="text-sm font-medium text-[var(--lt-ink)]">New booking</h3>
      {state && !state.ok ? (
        <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-[var(--lt-ok)]">Booking saved.</p>
      ) : null}
      <input type="hidden" name="roomId" value={roomId} />
      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Title</span>
        <input
          name="title"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="Choir rehearsal"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Starts</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Ends</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Link to event (optional)</span>
        <select
          name="eventId"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          defaultValue=""
        >
          <option value="">None</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Booked by</span>
        <input
          name="bookedBy"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Notes</span>
        <textarea
          name="notes"
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <button type="submit" disabled={pending} className="lt-btn-primary disabled:opacity-60">
        {pending ? "Booking…" : "Book room"}
      </button>
    </form>
  );
}
