"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ObligationTypeOption = {
  id: string;
  kind: string;
  name: string;
  code: string;
};

type MemberOption = {
  id: string;
  name: string;
  memberNumber: string | null;
};

type FellowshipOption = {
  id: string;
  name: string;
  code: string;
};

export function CreateObligationForm({
  types,
  members,
  fellowships,
  canWrite,
}: {
  types: ObligationTypeOption[];
  members: MemberOption[];
  fellowships: FellowshipOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState(types[0]?.kind ?? "Pledge");

  if (!canWrite) {
    return (
      <p className="text-sm text-slate-600">
        Your role is read-only. Financial Secretary or Admin can create
        obligations.
      </p>
    );
  }

  const selectedType = types.find((t) => t.kind === kind) ?? types[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = {
      memberId: String(form.get("memberId")),
      obligationTypeId: selectedType?.id,
      fellowshipMinistryId: String(form.get("fellowshipMinistryId") || "") || null,
      periodStart: String(form.get("periodStart")),
      periodEnd: String(form.get("periodEnd") || "") || null,
      expectedAmount: Number(form.get("expectedAmount")),
      instalmentCount: form.get("instalmentCount")
        ? Number(form.get("instalmentCount"))
        : null,
      projectTargetAmount: form.get("projectTargetAmount")
        ? Number(form.get("projectTargetAmount"))
        : null,
      notes: String(form.get("notes") || "") || null,
    };

    try {
      const res = await fetch("/api/finance/obligations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create obligation");
        return;
      }
      router.push(`/finance/obligations/${data.obligation.id}`);
      router.refresh();
    } catch {
      setError("Network error creating obligation");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">New obligation</h2>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Type</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {types.map((t) => (
              <option key={t.id} value={t.kind}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Member</span>
          <select
            name="memberId"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Select member…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.memberNumber ? ` (${m.memberNumber})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Period start</span>
          <input
            type="date"
            name="periodStart"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Period end (optional)</span>
          <input
            type="date"
            name="periodEnd"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Expected amount (GH₵)</span>
          <input
            type="number"
            name="expectedAmount"
            step="0.01"
            min="0"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        {kind === "Pledge" && (
          <label className="block text-sm">
            <span className="text-slate-600">Instalment count</span>
            <input
              type="number"
              name="instalmentCount"
              min="1"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        )}

        {kind === "SpecialProject" && (
          <label className="block text-sm">
            <span className="text-slate-600">Project target (GH₵)</span>
            <input
              type="number"
              name="projectTargetAmount"
              step="0.01"
              min="0"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="text-slate-600">Fellowship (optional)</span>
          <select
            name="fellowshipMinistryId"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">None</option>
            {fellowships.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-600">Notes</span>
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create obligation"}
      </button>
    </form>
  );
}
