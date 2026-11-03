"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { ActionResult } from "@/lib/members/actions";

type Option = { id: string; label: string; branchId?: string };

type Initial = {
  memberId?: string;
  firstName?: string;
  lastName?: string;
  otherNames?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  branchId?: string;
  cellId?: string | null;
  fellowshipMinistryId?: string | null;
  householdName?: string | null;
  householdRelation?: string | null;
  photoUrl?: string | null;
};

type Props = {
  mode: "create" | "edit";
  action: (
    prev: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  branches: Option[];
  cells: Option[];
  fellowships: Option[];
  initial?: Initial;
  readOnly?: boolean;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

export function MemberForm({
  mode,
  action,
  branches,
  cells,
  fellowships,
  initial,
  readOnly,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [branchId, setBranchId] = useState(initial?.branchId ?? branches[0]?.id ?? "");
  const [forceCreate, setForceCreate] = useState(false);

  const filteredCells = useMemo(
    () => cells.filter((c) => !c.branchId || c.branchId === branchId),
    [cells, branchId],
  );

  return (
    <form action={formAction} className="space-y-6">
      {initial?.memberId ? (
        <input type="hidden" name="memberId" value={initial.memberId} />
      ) : null}
      <input type="hidden" name="forceCreate" value={forceCreate ? "true" : "false"} />

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white/90 p-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-medium uppercase tracking-wide text-slate-500">
          Biodata
        </h2>
        <label className="text-sm">
          First name
          <input
            name="firstName"
            required
            disabled={readOnly}
            defaultValue={initial?.firstName ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Last name
          <input
            name="lastName"
            required
            disabled={readOnly}
            defaultValue={initial?.lastName ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Other names
          <input
            name="otherNames"
            disabled={readOnly}
            defaultValue={initial?.otherNames ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Date of birth
          <input
            type="date"
            name="dateOfBirth"
            disabled={readOnly}
            defaultValue={initial?.dateOfBirth ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Gender
          <select
            name="gender"
            disabled={readOnly}
            defaultValue={initial?.gender ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="text-sm">
          Phone
          <input
            name="phone"
            disabled={readOnly}
            defaultValue={initial?.phone ?? ""}
            className={inputClass}
            placeholder="+233..."
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Email
          <input
            type="email"
            name="email"
            disabled={readOnly}
            defaultValue={initial?.email ?? ""}
            className={inputClass}
          />
        </label>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white/90 p-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-medium uppercase tracking-wide text-slate-500">
          Location & household
        </h2>
        <label className="text-sm sm:col-span-2">
          Address line 1
          <input
            name="addressLine1"
            disabled={readOnly}
            defaultValue={initial?.addressLine1 ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Address line 2
          <input
            name="addressLine2"
            disabled={readOnly}
            defaultValue={initial?.addressLine2 ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          City
          <input
            name="city"
            disabled={readOnly}
            defaultValue={initial?.city ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Region
          <input
            name="region"
            disabled={readOnly}
            defaultValue={initial?.region ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Country
          <input
            name="country"
            disabled={readOnly}
            defaultValue={initial?.country ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Household name
          <input
            name="householdName"
            disabled={readOnly}
            defaultValue={initial?.householdName ?? ""}
            className={inputClass}
            placeholder="e.g. Mensah Family"
          />
        </label>
        <label className="text-sm">
          Household relation
          <select
            name="householdRelation"
            disabled={readOnly}
            defaultValue={initial?.householdRelation ?? "Head"}
            className={inputClass}
          >
            <option value="Head">Head</option>
            <option value="Spouse">Spouse</option>
            <option value="Child">Child</option>
            <option value="Dependent">Dependent</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white/90 p-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-medium uppercase tracking-wide text-slate-500">
          Branch, groups & photo
        </h2>
        <label className="text-sm">
          Branch
          {mode === "edit" ? (
            <>
              <input type="hidden" name="branchId" value={branchId} />
              <div className={`${inputClass} bg-slate-50 text-slate-700`}>
                {branches.find((b) => b.id === branchId)?.label ?? branchId}
                <span className="block text-xs text-slate-500">
                  Use Branch transfer to move between branches.
                </span>
              </div>
            </>
          ) : (
            <select
              name="branchId"
              required
              disabled={readOnly}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className={inputClass}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="text-sm">
          Cell
          <select
            name="cellId"
            disabled={readOnly}
            defaultValue={initial?.cellId ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {filteredCells.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Fellowship ministry
          <select
            name="fellowshipMinistryId"
            disabled={readOnly}
            defaultValue={initial?.fellowshipMinistryId ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {fellowships.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Photo
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            disabled={readOnly}
            className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1`}
          />
        </label>
        {initial?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={initial.photoUrl}
            alt="Current member photo"
            className="h-28 w-28 rounded-md object-cover border border-slate-200"
          />
        ) : null}
      </section>

      {state && !state.ok ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3" role="alert">
          <p className="text-sm text-amber-950">{state.error}</p>
          {state.duplicates?.length ? (
            <ul className="space-y-2 text-sm">
              {state.duplicates.map((d) => (
                <li key={d.id} className="rounded-md border border-amber-200 bg-white px-3 py-2">
                  <Link href={`/members/${d.id}`} className="font-medium text-sky-900 hover:underline">
                    {d.name}
                  </Link>
                  {d.memberNumber ? (
                    <span className="text-slate-500"> · {d.memberNumber}</span>
                  ) : null}
                  <span className="text-slate-500"> · score {d.score}</span>
                  <div className="text-slate-600">{d.reasons.join("; ")}</div>
                </li>
              ))}
            </ul>
          ) : null}
          {mode === "create" && state.duplicates?.length ? (
            <label className="flex items-center gap-2 text-sm text-amber-950">
              <input
                type="checkbox"
                checked={forceCreate}
                onChange={(e) => setForceCreate(e.target.checked)}
              />
              Force create anyway (records duplicate candidate for review)
            </label>
          ) : null}
        </div>
      ) : null}

      {state?.ok && state.warning ? (
        <p className="text-sm text-emerald-800">{state.warning}</p>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {pending
              ? "Saving…"
              : mode === "create"
                ? forceCreate
                  ? "Force register member"
                  : "Register member"
                : "Save changes"}
          </button>
          <Link
            href={initial?.memberId ? `/members/${initial.memberId}` : "/members"}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      ) : null}
    </form>
  );
}
