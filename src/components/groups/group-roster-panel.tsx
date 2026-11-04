"use client";

import { useState } from "react";
import { addRosterAction, removeRosterAction } from "@/lib/groups/actions";

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string | null;
  phone: string | null;
};

type RosterRow = {
  id: string;
  roleNote: string | null;
  member: MemberOption;
};

export function GroupRosterPanel({
  groupId,
  branchId,
  roster,
  writeOk,
}: {
  groupId: string;
  branchId?: string | null;
  roster: RosterRow[];
  writeOk: boolean;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MemberOption[]>([]);
  const [busy, setBusy] = useState(false);

  async function search(next: string) {
    setQ(next);
    if (next.trim().length < 2) {
      setHits([]);
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams({ q: next });
      if (branchId) params.set("branchId", branchId);
      const res = await fetch(`/api/groups/members?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { members: MemberOption[] };
        setHits(data.members ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lt-panel space-y-4 p-5">
      <div>
        <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Roster
        </h3>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          First-class group membership — printable from this hub.
        </p>
      </div>

      {writeOk ? (
        <div className="space-y-2 border-b border-[var(--lt-line)] pb-4">
          <label className="block text-sm">
            Add member
            <input
              value={q}
              onChange={(e) => void search(e.target.value)}
              placeholder="Search name, number, or phone"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]"
            />
          </label>
          {busy ? (
            <p className="text-xs text-[var(--lt-muted)]">Searching…</p>
          ) : null}
          {hits.length > 0 ? (
            <ul className="divide-y divide-slate-100 rounded-md border border-[var(--lt-line)]">
              {hits.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span>
                    {m.lastName}, {m.firstName}
                    {m.memberNumber ? (
                      <span className="text-[var(--lt-muted)]">
                        {" "}
                        · {m.memberNumber}
                      </span>
                    ) : null}
                  </span>
                  <form action={addRosterAction}>
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="memberId" value={m.id} />
                    <button type="submit" className="lt-btn-secondary">
                      Add
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {roster.length === 0 ? (
        <p className="text-sm text-[var(--lt-muted)]">No members on this roster yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {roster.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div>
                <div className="font-medium">
                  {row.member.lastName}, {row.member.firstName}
                </div>
                <div className="text-xs text-[var(--lt-muted)]">
                  {[row.member.memberNumber, row.member.phone, row.roleNote]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              {writeOk ? (
                <form action={removeRosterAction}>
                  <input type="hidden" name="entryId" value={row.id} />
                  <input type="hidden" name="groupId" value={groupId} />
                  <button type="submit" className="lt-btn-secondary">
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
