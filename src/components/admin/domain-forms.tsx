"use client";

import { useActionState } from "react";
import type { AdminActionResult } from "@/lib/admin/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

export function CreateDomainListForm({
  action,
}: {
  action: (
    prev: AdminActionResult | null,
    formData: FormData,
  ) => Promise<AdminActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
        New domain list
      </h2>
      <label className="block text-sm">
        Key
        <input name="key" required placeholder="e.g. gender" className={inputClass} />
      </label>
      <label className="block text-sm">
        Label
        <input name="label" required placeholder="Gender" className={inputClass} />
      </label>
      <label className="block text-sm">
        Description
        <textarea name="description" rows={2} className={inputClass} />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">Domain list created.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create domain"}
      </button>
    </form>
  );
}

export function AddDomainValueForm({
  domainListId,
  parentOptions,
  action,
}: {
  domainListId: string;
  parentOptions: Array<{ value: string; label: string }>;
  action: (
    prev: AdminActionResult | null,
    formData: FormData,
  ) => Promise<AdminActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
        Add value / subdomain
      </h2>
      <input type="hidden" name="domainListId" value={domainListId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Value token
          <input name="value" required placeholder="Male" className={inputClass} />
        </label>
        <label className="block text-sm">
          Label
          <input name="label" required placeholder="Male" className={inputClass} />
        </label>
        <label className="block text-sm">
          Sort order
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={0}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Parent value (subdomain)
          <select name="parentValue" defaultValue="" className={inputClass}>
            <option value="">— none (top-level) —</option>
            {parentOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} ({o.value})
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" value="true" defaultChecked />
        Active
      </label>
      <input type="hidden" name="isActivePresent" value="1" />
      {state && !state.ok ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">Value added.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add value"}
      </button>
    </form>
  );
}

export function UpdateDomainValueForm({
  value,
  parentOptions,
  action,
}: {
  value: {
    id: string;
    label: string;
    sortOrder: number;
    parentValue: string | null;
    isActive: boolean;
  };
  parentOptions: Array<{ value: string; label: string }>;
  action: (
    prev: AdminActionResult | null,
    formData: FormData,
  ) => Promise<AdminActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={value.id} />
      <label className="text-xs">
        Label
        <input
          name="label"
          defaultValue={value.label}
          required
          className={inputClass}
        />
      </label>
      <label className="text-xs">
        Sort
        <input
          name="sortOrder"
          type="number"
          defaultValue={value.sortOrder}
          className={inputClass}
        />
      </label>
      <label className="text-xs">
        Parent
        <select
          name="parentValue"
          defaultValue={value.parentValue ?? ""}
          className={inputClass}
        >
          <option value="">— none —</option>
          {parentOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex items-center gap-1 text-xs pb-2">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={value.isActive}
        />
        Active
      </label>
      <input type="hidden" name="isActivePresent" value="1" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "…" : "Save"}
      </button>
      {state && !state.ok ? (
        <span className="text-xs text-red-700 w-full">{state.error}</span>
      ) : null}
    </form>
  );
}
