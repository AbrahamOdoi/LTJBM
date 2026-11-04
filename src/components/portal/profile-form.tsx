"use client";

import { useActionState } from "react";
import {
  updatePortalProfileAction,
  type PortalActionResult,
} from "@/lib/portal/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

export function PortalProfileForm({
  initial,
}: {
  initial: {
    phone: string | null;
    email: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updatePortalProfileAction,
    null as PortalActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-3 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
        Update contact details
      </h2>
      {state?.ok ? (
        <p className="text-sm text-emerald-700">Saved.</p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-rose-700">{state.error}</p>
      ) : null}
      <label className="block text-sm">
        Phone
        <input name="phone" defaultValue={initial.phone ?? ""} className={inputClass} />
      </label>
      <label className="block text-sm">
        Email
        <input
          type="email"
          name="email"
          defaultValue={initial.email ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        Address line 1
        <input
          name="addressLine1"
          defaultValue={initial.addressLine1 ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        Address line 2
        <input
          name="addressLine2"
          defaultValue={initial.addressLine2 ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        City
        <input name="city" defaultValue={initial.city ?? ""} className={inputClass} />
      </label>
      <label className="block text-sm">
        Region
        <input name="region" defaultValue={initial.region ?? ""} className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Saving…" : "Save contact details"}
      </button>
      <p className="text-xs text-[var(--lt-muted)]">
        Branch, status, and sacramental dates are updated by Records Clerk / Data Centre.
      </p>
    </form>
  );
}
