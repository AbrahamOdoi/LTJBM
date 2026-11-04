"use client";

import { saveMemberCustomFieldsAction } from "@/lib/custom-fields/actions";

type FieldRow = {
  definition: {
    id: string;
    key: string;
    label: string;
    fieldType: string;
    helpText: string | null;
    isRequired: boolean;
    optionsJson: unknown;
  };
  value: string;
};

function selectOptions(optionsJson: unknown): string[] {
  if (Array.isArray(optionsJson)) {
    return optionsJson.map(String);
  }
  return [];
}

export function MemberCustomFieldsPanel({
  memberId,
  rows,
  writeOk,
}: {
  memberId: string;
  rows: FieldRow[];
  writeOk: boolean;
}) {
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-2">
        <h3 className="text-sm font-medium text-slate-800">Custom fields</h3>
        <p className="text-sm text-slate-500">
          No active custom fields. Data Centre can define them under Custom fields.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3">
      <h3 className="text-sm font-medium text-slate-800">Custom fields</h3>
      {writeOk ? (
        <form action={saveMemberCustomFieldsAction} className="space-y-3">
          <input type="hidden" name="memberId" value={memberId} />
          {rows.map(({ definition, value }) => {
            const name = `cf_${definition.id}`;
            const opts = selectOptions(definition.optionsJson);
            return (
              <label key={definition.id} className="block text-sm">
                <span className="text-slate-600">
                  {definition.label}
                  {definition.isRequired ? " *" : ""}
                </span>
                {definition.fieldType === "TextArea" ? (
                  <textarea
                    name={name}
                    defaultValue={value}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
                  />
                ) : definition.fieldType === "Boolean" ? (
                  <select
                    name={name}
                    defaultValue={value || ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
                  >
                    <option value="">—</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : definition.fieldType === "Select" ? (
                  <select
                    name={name}
                    defaultValue={value || ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
                  >
                    <option value="">—</option>
                    {opts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={name}
                    type={
                      definition.fieldType === "Number"
                        ? "number"
                        : definition.fieldType === "Date"
                          ? "date"
                          : "text"
                    }
                    defaultValue={value}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
                  />
                )}
                {definition.helpText ? (
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {definition.helpText}
                  </span>
                ) : null}
              </label>
            );
          })}
          <button type="submit" className="lt-btn-secondary !py-1.5 text-xs">
            Save custom fields
          </button>
        </form>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map(({ definition, value }) => (
            <li key={definition.id}>
              <span className="text-slate-500">{definition.label}: </span>
              {value || "—"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
