"use client";

import { useActionState } from "react";
import {
  releaseByCodeAction,
  type KidsActionResult,
} from "@/lib/kids/actions";

export function PickupReleaseForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState<
    KidsActionResult | null,
    FormData
  >(releaseByCodeAction, null);

  return (
    <form action={action} className="lt-panel space-y-4 p-6">
      <input type="hidden" name="sessionId" value={sessionId} />
      <h3 className="text-lg font-semibold text-[var(--lt-ink)]">
        Staff release
      </h3>
      <p className="text-sm text-[var(--lt-muted)]">
        Match the guardian’s pickup tag code before releasing the child from the
        classroom.
      </p>
      <label className="block text-sm">
        Pickup code
        <input
          name="pickupCode"
          required
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="e.g. K4M9PQ"
          className="mt-1 w-full rounded-md border border-slate-300 px-4 py-3 font-mono text-xl tracking-widest uppercase"
        />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
      ) : null}
      {state && state.ok ? (
        <p className="rounded-md border border-[color-mix(in_srgb,var(--lt-ok)_35%,var(--lt-line))] bg-[color-mix(in_srgb,var(--lt-ok)_12%,white)] px-3 py-2 text-sm text-[var(--lt-ink)]">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Releasing…" : "Release child"}
      </button>
    </form>
  );
}
