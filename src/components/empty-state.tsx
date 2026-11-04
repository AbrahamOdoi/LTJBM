import Link from "next/link";
import { UI_SCENES } from "@/lib/ui-scenes";

type Props = {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  /** Show quiet interior photography behind empty copy */
  withScene?: boolean;
};

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  withScene = true,
}: Props) {
  return (
    <div className="lt-panel overflow-hidden">
      {withScene ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={UI_SCENES.empty.src}
          alt={UI_SCENES.empty.alt}
          className="h-28 w-full object-cover sm:h-32"
        />
      ) : null}
      <div className="border-t border-dashed border-[var(--lt-line-strong)] px-5 py-8 text-center">
        <h3 className="text-base font-medium text-[var(--lt-ink)]">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--lt-muted)]">
          {body}
        </p>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="lt-btn-primary mt-4">
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
