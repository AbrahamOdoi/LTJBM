"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddPaymentForm({
  obligationId,
  batches,
  canWrite,
}: {
  obligationId: string;
  batches: Array<{ id: string; label: string; batchDate: string }>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!canWrite) {
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = {
      obligationId,
      amount: Number(form.get("amount")),
      paidAt: String(form.get("paidAt")),
      method: String(form.get("method") || "") || null,
      reference: String(form.get("reference") || "") || null,
      notes: String(form.get("notes") || "") || null,
      batchId: String(form.get("batchId") || "") || null,
    };

    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to post payment");
        return;
      }
      e.currentTarget.reset();
      router.refresh();
    } catch {
      setError("Network error posting payment");
    } finally {
      setPending(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold">Post payment</h3>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Amount (GH₵)</span>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Paid at</span>
          <input
            type="date"
            name="paidAt"
            defaultValue={today}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Method</span>
          <input
            name="method"
            placeholder="Cash / MoMo / Bank"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Reference</span>
          <input
            name="reference"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-600">Saturday batch (optional)</span>
          <select
            name="batchId"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">None</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label} ({b.batchDate.slice(0, 10)})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
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
        {pending ? "Posting…" : "Post payment"}
      </button>
    </form>
  );
}
