"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markPresentAction } from "@/lib/attendance/actions";

export function MarkAttendanceForm({
  sessionId,
  branchId,
}: {
  sessionId: string;
  branchId: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    Array<{ id: string; firstName: string; lastName: string; memberNumber: string | null }>
  >([]);
  const [pending, setPending] = useState(false);

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

  async function mark(memberId: string) {
    const fd = new FormData();
    fd.set("sessionId", sessionId);
    fd.set("memberId", memberId);
    await markPresentAction(fd);
    setQ("");
    setResults([]);
    router.refresh();
  }

  return (
    <div className="lt-panel space-y-3 p-4">
      <h3 className="text-sm font-medium">Mark member present</h3>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
          placeholder="Search name or member number…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={pending}
          className="lt-btn-secondary shrink-0"
        >
          Search
        </button>
      </div>
      {results.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
          {results.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-3 py-2">
              <span>
                {m.firstName} {m.lastName}
                <span className="text-slate-500"> · {m.memberNumber ?? "—"}</span>
              </span>
              <button
                type="button"
                className="lt-btn-primary !py-1 text-xs"
                onClick={() => void mark(m.id)}
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
