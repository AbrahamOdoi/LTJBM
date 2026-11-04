"use client";

import { useActionState } from "react";
import {
  publicCheckInAction,
  type PublicCheckInResult,
} from "@/lib/attendance/actions";

const initial: PublicCheckInResult | null = null;

export function PublicCheckInForm({
  token,
  sessionLabel,
}: {
  token: string;
  sessionLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    publicCheckInAction,
    initial,
  );

  return (
    <div className="mx-auto w-full max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Check in
        </h1>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">{sessionLabel}</p>
      </div>

      {state?.ok ? (
        <div className="lt-panel space-y-2 p-5">
          <p className="text-lg font-medium text-[var(--lt-ink)]">
            Welcome, {state.memberName}
          </p>
          <p className="text-sm text-[var(--lt-muted)]">
            You are marked present
            {state.memberNumber ? ` · #${state.memberNumber}` : ""}.
          </p>
        </div>
      ) : null}

      {state && !state.ok ? (
        <p className="rounded-md border border-[color-mix(in_srgb,var(--lt-danger)_35%,var(--lt-line))] bg-[color-mix(in_srgb,var(--lt-danger)_10%,white)] px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="lt-panel space-y-4 p-5">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="source" value="Mobile" />
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Member number</span>
          <input
            name="memberNumber"
            required
            autoComplete="off"
            placeholder="e.g. LTJ-00142"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="lt-btn-primary w-full !py-2.5 disabled:opacity-60"
        >
          {pending ? "Checking in…" : "Check in"}
        </button>
      </form>
    </div>
  );
}
