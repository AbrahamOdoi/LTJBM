"use client";

import { useActionState, useState } from "react";
import {
  assignVolunteerAction,
  type VolunteerActionResult,
} from "@/lib/volunteers/actions";

type MemberHit = {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string | null;
};

export function AssignVolunteerForm({
  needId,
  serviceId,
  branchId,
  roleLabel,
}: {
  needId: string;
  serviceId: string;
  branchId?: string | null;
  roleLabel: string;
}) {
  const [state, action, pending] = useActionState<
    VolunteerActionResult | null,
    FormData
  >(assignVolunteerAction, null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [selected, setSelected] = useState<MemberHit | null>(null);
  const [allowConflict, setAllowConflict] = useState(false);

  async function search() {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const url = new URL("/api/volunteers/members", window.location.origin);
    url.searchParams.set("q", q);
    if (branchId) url.searchParams.set("branchId", branchId);
    const res = await fetch(url);
    const data = await res.json();
    setHits(data.members ?? []);
  }

  return (
    <form action={action} className="space-y-3 rounded-md border border-[var(--lt-line)] bg-white p-3">
      <input type="hidden" name="needId" value={needId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="memberId" value={selected?.id ?? ""} />
      <input
        type="hidden"
        name="allowConflict"
        value={allowConflict ? "1" : "0"}
      />
      <p className="text-xs font-medium text-[var(--lt-muted)]">
        Assign · {roleLabel}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
          placeholder="Search volunteer…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void search()}
          className="lt-btn-secondary shrink-0"
        >
          Search
        </button>
      </div>
      {hits.length > 0 ? (
        <ul className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
          {hits.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left hover:bg-[#eef0f3] ${
                  selected?.id === m.id ? "bg-[var(--lt-accent-soft)]" : ""
                }`}
                onClick={() => setSelected(m)}
              >
                {m.firstName} {m.lastName}
                <span className="text-[var(--lt-muted)]">
                  {" "}
                  · {m.memberNumber ?? "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {selected ? (
        <p className="text-sm text-[var(--lt-ink)]">
          Selected: {selected.firstName} {selected.lastName}
        </p>
      ) : null}
      {state && !state.ok ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
          {state.conflicts && state.conflicts.length > 0 ? (
            <>
              <ul className="text-xs text-[var(--lt-muted)]">
                {state.conflicts.map((c, i) => (
                  <li key={i}>
                    Already on {c.teamName} · {c.roleName} ({c.serviceLabel})
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowConflict}
                  onChange={(e) => setAllowConflict(e.target.checked)}
                />
                Assign anyway (override conflict)
              </label>
            </>
          ) : null}
        </div>
      ) : null}
      {state && state.ok ? (
        <p className="text-sm text-[var(--lt-ok)]">
          {state.message}
          {state.warning ? ` — ${state.warning}` : ""}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !selected}
        className="lt-btn-primary"
      >
        {pending ? "Assigning…" : "Assign"}
      </button>
    </form>
  );
}
