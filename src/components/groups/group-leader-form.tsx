"use client";

import { useActionState, useState } from "react";
import {
  assignLeaderAction,
  type GroupActionResult,
} from "@/lib/groups/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string | null;
};

export function GroupLeaderForm({
  groupId,
  branchId,
  rosterMembers,
}: {
  groupId: string;
  branchId?: string | null;
  rosterMembers: MemberOption[];
}) {
  const [state, formAction, pending] = useActionState(
    assignLeaderAction,
    null as GroupActionResult | null,
  );
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MemberOption[]>([]);
  const [memberId, setMemberId] = useState(rosterMembers[0]?.id ?? "");

  async function search(next: string) {
    setQ(next);
    if (next.trim().length < 2) {
      setHits([]);
      return;
    }
    const params = new URLSearchParams({ q: next });
    if (branchId) params.set("branchId", branchId);
    const res = await fetch(`/api/groups/members?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { members: MemberOption[] };
      setHits(data.members ?? []);
    }
  }

  return (
    <form action={formAction} className="space-y-3 border-t border-[var(--lt-line)] pt-4">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="memberId" value={memberId} />
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
        Leader (from roster or search)
        <select
          className={inputClass}
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          <option value="">Select member…</option>
          {rosterMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.lastName}, {m.firstName}
              {m.memberNumber ? ` (${m.memberNumber})` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        Or search register
        <input
          value={q}
          onChange={(e) => void search(e.target.value)}
          placeholder="Type to find a member"
          className={inputClass}
        />
      </label>
      {hits.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {hits.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="lt-link"
                onClick={() => {
                  setMemberId(m.id);
                  setQ(`${m.lastName}, ${m.firstName}`);
                  setHits([]);
                }}
              >
                {m.lastName}, {m.firstName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="block text-sm">
        Title
        <input
          name="title"
          placeholder="Cell leader, Choir director, Head usher…"
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        Notes
        <input name="notes" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending || !memberId}
        className="lt-btn-primary"
      >
        {pending ? "Saving…" : "Assign leader"}
      </button>
    </form>
  );
}
