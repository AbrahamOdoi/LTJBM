"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createSessionAction,
  type AttendanceActionResult,
} from "@/lib/attendance/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

export function CreateSessionForm({
  branches,
  cells,
}: {
  branches: Array<{ id: string; label: string }>;
  cells: Array<{ id: string; label: string; branchId: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createSessionAction,
    null as AttendanceActionResult | null,
  );
  const [kind, setKind] = useState("Service");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const filteredCells = useMemo(
    () => cells.filter((c) => c.branchId === branchId),
    [cells, branchId],
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="lt-panel space-y-4 p-5">
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <label className="block text-sm">
        Kind
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={inputClass}
        >
          <option value="Service">Service</option>
          <option value="Cell">Cell</option>
        </select>
      </label>
      <label className="block text-sm">
        Label
        <input
          name="label"
          required
          placeholder="Sunday worship / Cell Alpha"
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        Date
        <input type="date" name="heldAt" required defaultValue={today} className={inputClass} />
      </label>
      <label className="block text-sm">
        Branch
        <select
          name="branchId"
          required
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className={inputClass}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      {kind === "Cell" ? (
        <label className="block text-sm">
          Cell
          <select name="cellId" className={inputClass} defaultValue="">
            <option value="">—</option>
            {filteredCells.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block text-sm">
        Headcount (optional)
        <input type="number" name="headcount" min={0} className={inputClass} />
      </label>
      <label className="block text-sm">
        Notes
        <textarea name="notes" rows={2} className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Creating…" : "Create session"}
      </button>
    </form>
  );
}
