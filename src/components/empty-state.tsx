import Link from "next/link";

type Props = {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
};

/** Consistent empty / zero-result panel for list surfaces. */
export function EmptyState({ title, body, actionHref, actionLabel }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center">
      <h3 className="text-base font-medium text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
        {body}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
