"use client";

import { useActionState, useState } from "react";
import { ALL_ROLES } from "@/lib/roles";
import type { AdminActionResult } from "@/lib/admin/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

type BranchOption = { id: string; name: string; code: string };

export function CreateUserForm({
  branches,
  action,
}: {
  branches: BranchOption[];
  action: (
    prev: AdminActionResult | null,
    formData: FormData,
  ) => Promise<AdminActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [role, setRole] = useState("RecordsClerk");

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
        Create user
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Name
          <input name="name" required className={inputClass} />
        </label>
        <label className="block text-sm">
          Email
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="block text-sm">
          Role
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Temporary password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
          />
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" value="true" defaultChecked />
        Active
      </label>
      <input type="hidden" name="isActivePresent" value="1" />
      {role === "BranchLeader" ? (
        <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-xs uppercase tracking-wide text-slate-500">
            Branch scope
          </legend>
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="branchIds" value={b.id} />
              {b.name} ({b.code})
            </label>
          ))}
        </fieldset>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">User created.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create user"}
      </button>
    </form>
  );
}

export function UpdateUserForm({
  user,
  branches,
  action,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    branchIds: string[];
  };
  branches: BranchOption[];
  action: (
    prev: AdminActionResult | null,
    formData: FormData,
  ) => Promise<AdminActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [role, setRole] = useState(user.role);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
        Edit user
      </h2>
      <input type="hidden" name="userId" value={user.id} />
      <p className="text-sm text-slate-600">
        Email: <span className="font-medium text-slate-900">{user.email}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Name
          <input
            name="name"
            required
            defaultValue={user.name}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Role
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          New password (optional)
          <input
            name="password"
            type="password"
            minLength={8}
            placeholder="Leave blank to keep current"
            className={inputClass}
          />
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={user.isActive}
        />
        Active
      </label>
      <input type="hidden" name="isActivePresent" value="1" />
      {role === "BranchLeader" ? (
        <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-xs uppercase tracking-wide text-slate-500">
            Branch scope
          </legend>
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="branchIds"
                value={b.id}
                defaultChecked={user.branchIds.includes(b.id)}
              />
              {b.name} ({b.code})
            </label>
          ))}
        </fieldset>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">User updated.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
