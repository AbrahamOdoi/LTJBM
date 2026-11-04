"use client";

import { useActionState } from "react";
import {
  createSermonAction,
  updateSermonAction,
  type MediaActionResult,
} from "@/lib/media/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lt-accent)]";

type SeriesOption = { id: string; name: string };

type SermonInitial = {
  id?: string;
  title?: string;
  preacher?: string;
  preachedAt?: string;
  scripture?: string | null;
  seriesId?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  summary?: string | null;
  publishedToPortal?: boolean;
  uploadFileName?: string;
  uploadMimeType?: string;
  uploadStorageKey?: string;
  uploadSizeBytes?: string;
};

export function SermonForm({
  series,
  initial,
}: {
  series: SeriesOption[];
  initial?: SermonInitial;
}) {
  const isEdit = Boolean(initial?.id);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateSermonAction : createSermonAction,
    null as MediaActionResult | null,
  );

  return (
    <form action={formAction} className="lt-panel space-y-4 p-5">
      {state && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {state.message}
        </p>
      ) : null}

      {isEdit ? <input type="hidden" name="id" value={initial?.id} /> : null}

      <label className="block text-sm">
        Title
        <input
          name="title"
          required
          defaultValue={initial?.title}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Preacher
          <input
            name="preacher"
            required
            defaultValue={initial?.preacher}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Date preached
          <input
            type="date"
            name="preachedAt"
            required
            defaultValue={initial?.preachedAt}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Scripture
          <input
            name="scripture"
            defaultValue={initial?.scripture ?? ""}
            placeholder="e.g. John 3:16"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Series
          <select
            name="seriesId"
            defaultValue={initial?.seriesId ?? ""}
            className={inputClass}
          >
            <option value="">No series</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        Summary
        <textarea
          name="summary"
          rows={3}
          defaultValue={initial?.summary ?? ""}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Audio URL
          <input
            name="audioUrl"
            type="url"
            defaultValue={initial?.audioUrl ?? ""}
            placeholder="https://"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          Video URL
          <input
            name="videoUrl"
            type="url"
            defaultValue={initial?.videoUrl ?? ""}
            placeholder="https://"
            className={inputClass}
          />
        </label>
      </div>

      <fieldset className="space-y-3 rounded-md border border-[var(--lt-line)] p-4">
        <legend className="px-1 text-sm font-medium text-[var(--lt-ink)]">
          Upload metadata (optional)
        </legend>
        <p className="text-xs text-[var(--lt-muted)]">
          Record file name / storage key when media lives outside this app —
          binary upload is not stored in the database.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            File name
            <input
              name="uploadFileName"
              defaultValue={initial?.uploadFileName ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            MIME type
            <input
              name="uploadMimeType"
              defaultValue={initial?.uploadMimeType ?? ""}
              placeholder="audio/mpeg"
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            Storage key
            <input
              name="uploadStorageKey"
              defaultValue={initial?.uploadStorageKey ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            Size (bytes)
            <input
              name="uploadSizeBytes"
              defaultValue={initial?.uploadSizeBytes ?? ""}
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="publishedToPortal"
          defaultChecked={initial?.publishedToPortal ?? true}
          className="rounded border-slate-300"
        />
        Publish to member portal
      </label>

      <button type="submit" disabled={pending} className="lt-btn-primary">
        {pending ? "Saving…" : isEdit ? "Save sermon" : "Add sermon"}
      </button>
    </form>
  );
}
