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
    <div className="rounded-lg border border-dashed border-[var(--lt-line)] bg-white/70 px-5 py-10 text-center">
      <h3 className="font-display text-lg font-medium text-[var(--lt-ink)]">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--lt-muted)]">
        {body}
      </p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="lt-btn-primary mt-4">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
