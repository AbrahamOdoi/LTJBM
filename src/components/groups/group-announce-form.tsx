"use client";

import { useActionState } from "react";
import {
  announceGroupAction,
  type GroupActionResult,
} from "@/lib/groups/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

export function GroupAnnounceForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(
    announceGroupAction,
    null as GroupActionResult | null,
  );

  return (
    <form action={formAction} className="space-y-3 border-t border-[var(--lt-line)] pt-4">
      <input type="hidden" name="groupId" value={groupId} />
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {state.message}
        </p>
      ) : null}
      <p className="text-xs text-[var(--lt-muted)]">
        Saves an in-app announcement and optionally logs stub outbox rows via{" "}
        <code className="text-[11px]">/admin/communications</code>. No live
        WhatsApp or SMS send.
      </p>
      <label className="block text-sm">
        Title
        <input name="title" required className={inputClass} />
      </label>
      <label className="block text-sm">
        Message
        <textarea name="body" required rows={4} className={inputClass} />
      </label>
      <label className="block text-sm">
        Channel (stub)
        <select name="channel" className={inputClass} defaultValue="Email">
          <option value="Email">Email</option>
          <option value="Sms">SMS</option>
          <option value="WhatsApp">WhatsApp (stub only)</option>
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="fanOut"
          value="true"
          defaultChecked
          className="mt-1"
        />
        <span>Log stub outbox for each roster contact</span>
      </label>
      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Posting…" : "Post announcement"}
      </button>
    </form>
  );
}
