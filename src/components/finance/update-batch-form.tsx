"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdateBatchForm({
  batchId,
  countedTotal,
  label,
  notes,
  canWrite,
}: {
  batchId: string;
  countedTotal: number;
  label: string;
  notes: string | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!canWrite) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = {
      countedTotal: Number(form.get("countedTotal")),
      label: String(form.get("label")),
      notes: String(form.get("notes") || "") || null,
    };

    try {
      const res = await fetch(`/api/finance/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update batch");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error updating batch");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold">Reconcile counted total</h3>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Counted total (GH₵)</span>
          <input
            type="number"
            name="countedTotal"
            step="0.01"
            min="0"
            defaultValue={countedTotal}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Label</span>
          <input
            name="label"
            defaultValue={label}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-600">Notes</span>
          <input
            name="notes"
            defaultValue={notes ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update & recalculate variance"}
      </button>
    </form>
  );
}
