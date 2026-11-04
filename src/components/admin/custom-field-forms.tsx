"use client";

import { useActionState } from "react";
import {
  createCustomFieldAction,
  toggleCustomFieldAction,
  type CustomFieldActionResult,
} from "@/lib/custom-fields/actions";

const initial: CustomFieldActionResult | null = null;

type FieldRow = {
  id: string;
  key: string;
  label: string;
  fieldType: string;
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
};

export function CustomFieldAdminForms({ fields }: { fields: FieldRow[] }) {
  const [state, action, pending] = useActionState(
    createCustomFieldAction,
    initial,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form action={action} className="lt-panel space-y-3 p-5 h-fit">
        <h2 className="text-sm font-medium text-[var(--lt-ink)]">Add field</h2>
        {state && !state.ok ? (
          <p className="text-sm text-[var(--lt-danger)]">{state.error}</p>
        ) : null}
        {state?.ok ? (
          <p className="text-sm text-[var(--lt-ok)]">Field created.</p>
        ) : null}
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Label</span>
          <input
            name="label"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="Preferred language"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Key (optional slug)</span>
          <input
            name="key"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="preferred_language"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Type</span>
          <select
            name="fieldType"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            defaultValue="Text"
          >
            {["Text", "TextArea", "Number", "Date", "Boolean", "Select"].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">
            Select options (comma or newline)
          </span>
          <textarea
            name="options"
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="English, Twi, Ga"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--lt-muted)]">Help text</span>
          <input
            name="helpText"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isRequired" />
          Required
        </label>
        <button type="submit" disabled={pending} className="lt-btn-primary disabled:opacity-60">
          {pending ? "Saving…" : "Create field"}
        </button>
      </form>

      <section className="lt-panel overflow-x-auto">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
          Defined fields ({fields.length})
        </h2>
        {fields.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">
            No custom fields yet. Domain dropdowns remain under Domains &amp;
            dropdowns.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    {f.label}
                    {f.isRequired ? (
                      <span className="text-[var(--lt-muted)]"> · required</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{f.key}</td>
                  <td className="px-4 py-3">{f.fieldType}</td>
                  <td className="px-4 py-3">{f.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleCustomFieldAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={f.isActive ? "0" : "1"}
                      />
                      <button type="submit" className="lt-btn-secondary !py-1 text-xs">
                        {f.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
