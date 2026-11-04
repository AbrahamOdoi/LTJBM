"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProviderStatus } from "@/lib/giving/providers";

type ObligationOption = {
  id: string;
  kind: string;
  name: string;
  periodStart: string;
  expected: number;
  paid: number;
  outstanding: number;
};

export function GiveForm({
  providers,
  defaultMemberNumber,
  obligations,
}: {
  providers: ProviderStatus[];
  defaultMemberNumber: string | null;
  obligations: ObligationOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = {
      amount: Number(form.get("amount")),
      method: String(form.get("method") || "MoMo"),
      provider: String(form.get("provider") || "") || null,
      memberNumber: String(form.get("memberNumber") || "").trim() || null,
      obligationId: String(form.get("obligationId") || "") || null,
      giftKindCode: String(form.get("giftKindCode") || "TITHE"),
      payerEmail: String(form.get("payerEmail") || "").trim() || null,
      payerPhone: String(form.get("payerPhone") || "").trim() || null,
      payerName: String(form.get("payerName") || "").trim() || null,
    };

    try {
      const res = await fetch("/api/giving/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout");
        return;
      }
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      router.push(`/give/complete?reference=${encodeURIComponent(data.reference)}`);
    } catch {
      setError("Network error starting checkout");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="lt-panel space-y-4 p-5">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Membership number</span>
        <input
          name="memberNumber"
          defaultValue={defaultMemberNumber ?? ""}
          required={!defaultMemberNumber}
          placeholder="e.g. LTJ-0001"
          className="mt-1 w-full rounded-md border border-[var(--lt-line)] px-3 py-2"
        />
      </label>

      {obligations.length > 0 ? (
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Apply to obligation (optional)</span>
          <select
            name="obligationId"
            className="mt-1 w-full rounded-md border border-[var(--lt-line)] px-3 py-2"
            defaultValue=""
          >
            <option value="">New gift for this period</option>
            {obligations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} · {o.periodStart} · outstanding GH₵
                {o.outstanding.toFixed(2)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Gift kind (when not applying to an obligation)</span>
        <select
          name="giftKindCode"
          className="mt-1 w-full rounded-md border border-[var(--lt-line)] px-3 py-2"
          defaultValue="TITHE"
        >
          <option value="TITHE">Tithe</option>
          <option value="THANKSGIVING">Thanksgiving</option>
          <option value="SPECIAL_PROJECT">Special project</option>
          <option value="PLEDGE">Pledge</option>
          <option value="DUES">Dues</option>
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Amount (GH₵)</span>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full rounded-md border border-[var(--lt-line)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Method</span>
          <select
            name="method"
            className="mt-1 w-full rounded-md border border-[var(--lt-line)] px-3 py-2"
            defaultValue="MoMo"
          >
            <option value="MoMo">Mobile money</option>
            <option value="Card">Card</option>
            <option value="Bank">Bank</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-[var(--lt-muted)]">Provider</span>
        <select
          name="provider"
          className="mt-1 w-full rounded-md border border-[var(--lt-line)] px-3 py-2"
          defaultValue=""
        >
          <option value="">Auto (live keys or demo)</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {p.demoFallback ? " · demo if keys missing" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Email (receipt)</span>
          <input
            type="email"
            name="payerEmail"
            className="mt-1 w-full rounded-md border border-[var(--lt-line)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Phone (MoMo)</span>
          <input
            name="payerPhone"
            className="mt-1 w-full rounded-md border border-[var(--lt-line)] px-3 py-2"
          />
        </label>
      </div>

      <input type="hidden" name="payerName" value="" />

      <button type="submit" disabled={pending} className="lt-btn-primary w-full sm:w-auto">
        {pending ? "Starting…" : "Continue to payment"}
      </button>

      <ul className="space-y-1 border-t border-[var(--lt-line)] pt-3 text-xs text-[var(--lt-muted)]">
        {providers.map((p) => (
          <li key={p.id}>
            <span className="font-medium text-[var(--lt-ink-soft)]">{p.id}:</span>{" "}
            {p.notes}
          </li>
        ))}
      </ul>
    </form>
  );
}
