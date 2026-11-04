"use client";

import { useActionState, useState } from "react";
import {
  publicKidsCheckInAction,
  publicKidsLookupAction,
  type PublicKidsCheckInResult,
  type PublicKidsLookupResult,
} from "@/lib/kids/actions";

export function PublicKidsCheckInForm({
  token,
  sessionLabel,
}: {
  token: string;
  sessionLabel: string;
}) {
  const [lookup, lookupAction, lookupPending] = useActionState<
    PublicKidsLookupResult | null,
    FormData
  >(publicKidsLookupAction, null);
  const [checkIn, checkInAction, checkInPending] = useActionState<
    PublicKidsCheckInResult | null,
    FormData
  >(publicKidsCheckInAction, null);
  const [guardianNumber, setGuardianNumber] = useState("");

  if (checkIn?.ok) {
    return (
      <div className="lt-panel space-y-4 p-6 text-center">
        <p className="text-sm text-[var(--lt-muted)]">{sessionLabel}</p>
        <h2 className="text-2xl font-semibold text-[var(--lt-ink)]">
          {checkIn.childName} is checked in
        </h2>
        <p className="text-sm text-[var(--lt-muted)]">
          Keep this pickup code with you. Children’s ministry staff will match it
          at release.
        </p>
        <p className="font-mono text-4xl font-semibold tracking-[0.25em] text-[var(--lt-accent)]">
          {checkIn.pickupCode}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={lookupAction} className="lt-panel space-y-4 p-6">
        <input type="hidden" name="token" value={token} />
        <h2 className="text-lg font-semibold text-[var(--lt-ink)]">
          Guardian check-in
        </h2>
        <p className="text-sm text-[var(--lt-muted)]">
          Enter your member number to see children linked to your household.
        </p>
        <label className="block text-sm">
          Guardian member number
          <input
            name="guardianMemberNumber"
            required
            value={guardianNumber}
            onChange={(e) => setGuardianNumber(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="e.g. FIN-001"
          />
        </label>
        {lookup && !lookup.ok ? (
          <p className="text-sm text-[var(--lt-danger)]">{lookup.error}</p>
        ) : null}
        <button type="submit" disabled={lookupPending} className="lt-btn-primary">
          {lookupPending ? "Looking up…" : "Find my children"}
        </button>
      </form>

      {lookup?.ok ? (
        <form action={checkInAction} className="lt-panel space-y-4 p-6">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="guardianMemberNumber" value={guardianNumber} />
          <input type="hidden" name="source" value="Mobile" />
          <p className="text-sm text-[var(--lt-muted)]">
            Signed in as <strong>{lookup.guardianName}</strong>
          </p>
          {lookup.children.length === 0 ? (
            <p className="text-sm text-[var(--lt-muted)]">
              No children are linked to this guardian. Ask Records Clerk to link
              the household or guardian record.
            </p>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-[var(--lt-ink)]">
                  Select child
                </legend>
                {lookup.children.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 rounded-md border border-[var(--lt-line)] px-3 py-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="childMemberId"
                      value={c.id}
                      required
                    />
                    <span>
                      {c.firstName} {c.lastName}
                      <span className="text-[var(--lt-muted)]">
                        {" "}
                        · {c.memberNumber ?? "—"}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {checkIn && !checkIn.ok ? (
                <p className="text-sm text-[var(--lt-danger)]">{checkIn.error}</p>
              ) : null}
              <button
                type="submit"
                disabled={checkInPending}
                className="lt-btn-primary"
              >
                {checkInPending ? "Checking in…" : "Check in child"}
              </button>
            </>
          )}
        </form>
      ) : null}
    </div>
  );
}
