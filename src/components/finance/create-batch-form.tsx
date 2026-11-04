"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateBatchForm({ canWrite }: { canWrite: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!canWrite) {
    return (
      <p className="text-sm text-slate-600">
        Read-only role — cannot open Saturday collection batches.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = {
      batchDate: String(form.get("batchDate")),
      label: String(form.get("label") || "Saturday collection"),
      countedTotal: Number(form.get("countedTotal")),
      notes: String(form.get("notes") || "") || null,
    };

    try {
      const res = await fetch("/api/finance/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create batch");
        return;
      }
      router.push(`/finance/batches/${data.batch.id}`);
      router.refresh();
    } catch {
      setError("Network error creating batch");
    } finally {
      setPending(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Open Saturday collection batch</h2>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Batch date</span>
          <input
            type="date"
            name="batchDate"
            defaultValue={today}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Label</span>
          <input
            name="label"
            defaultValue="Saturday collection"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Counted total (GH₵)</span>
          <input
            type="number"
            name="countedTotal"
            step="0.01"
            min="0"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Notes</span>
          <input
            name="notes"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create batch"}
      </button>
    </form>
  );
}
