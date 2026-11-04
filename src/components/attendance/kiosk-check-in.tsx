"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markPresentAction } from "@/lib/attendance/actions";

type MemberHit = {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string | null;
};

export function KioskCheckIn({
  sessionId,
  branchId,
}: {
  sessionId: string;
  branchId: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MemberHit[]>([]);
  const [pending, setPending] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function search() {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setPending(true);
    try {
      const res = await fetch(
        `/api/attendance/members?q=${encodeURIComponent(q)}&branchId=${encodeURIComponent(branchId)}`,
      );
      const data = await res.json();
      setResults(data.members ?? []);
    } finally {
      setPending(false);
    }
  }

  async function mark(member: MemberHit) {
    const fd = new FormData();
    fd.set("sessionId", sessionId);
    fd.set("memberId", member.id);
    fd.set("source", "Kiosk");
    await markPresentAction(fd);
    setFlash(`${member.firstName} ${member.lastName} checked in`);
    setQ("");
    setResults([]);
    router.refresh();
    window.setTimeout(() => setFlash(null), 2500);
  }

  return (
    <div className="lt-panel space-y-4 p-6">
      <h3 className="text-lg font-semibold text-[var(--lt-ink)]">Kiosk check-in</h3>
      <p className="text-sm text-[var(--lt-muted)]">
        Search by name or member number, then tap Present. Large targets for tablet use.
      </p>
      {flash ? (
        <p className="rounded-md border border-[color-mix(in_srgb,var(--lt-ok)_35%,var(--lt-line))] bg-[color-mix(in_srgb,var(--lt-ok)_12%,white)] px-4 py-3 text-base font-medium text-[var(--lt-ink)]">
          {flash}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
          placeholder="Name or member number…"
          className="w-full rounded-md border border-slate-300 px-4 py-3 text-lg"
          autoFocus
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={pending}
          className="lt-btn-secondary shrink-0 !px-6 !py-3 text-base"
        >
          Search
        </button>
      </div>
      {results.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {results.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-base"
            >
              <span>
                {m.firstName} {m.lastName}
                <span className="text-[var(--lt-muted)]">
                  {" "}
                  · {m.memberNumber ?? "—"}
                </span>
              </span>
              <button
                type="button"
                className="lt-btn-primary !px-5 !py-2.5 text-base"
                onClick={() => void mark(m)}
              >
                Present
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
