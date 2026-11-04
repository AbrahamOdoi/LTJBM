import Link from "next/link";
import {
  DEFAULT_PAGE_SIZE,
  hrefWithParams,
  type PageResult,
} from "@/lib/data-table";

type Props = {
  pathname: string;
  /** Active URL filter values (excluding page when linking). */
  filters: Record<string, string | number | undefined | null>;
  result: Pick<PageResult<unknown>, "page" | "pageSize" | "pageCount" | "total">;
  /** Optional noun for the count line, e.g. "members". */
  noun?: string;
};

export function DataTablePagination({
  pathname,
  filters,
  result,
  noun = "rows",
}: Props) {
  const { page, pageSize, pageCount, total } = result;
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const base = {
    ...filters,
    pageSize: pageSize === DEFAULT_PAGE_SIZE ? undefined : pageSize,
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--lt-line)] bg-[var(--lt-paper-elevated)] px-4 py-3 text-sm text-[var(--lt-muted)]">
      <p>
        Showing{" "}
        <span className="tabular-nums text-[var(--lt-ink-soft)]">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="tabular-nums text-[var(--lt-ink-soft)]">{total}</span>{" "}
        {noun}
      </p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <span className="lt-btn-secondary pointer-events-none opacity-45 !py-1.5">
            Previous
          </span>
        ) : (
          <Link
            href={hrefWithParams(pathname, base, { page: page - 1 })}
            className="lt-btn-secondary !py-1.5"
            rel="prev"
          >
            Previous
          </Link>
        )}
        <span className="tabular-nums px-1 text-[var(--lt-ink-soft)]">
          Page {page} / {pageCount}
        </span>
        {page >= pageCount ? (
          <span className="lt-btn-secondary pointer-events-none opacity-45 !py-1.5">
            Next
          </span>
        ) : (
          <Link
            href={hrefWithParams(pathname, base, { page: page + 1 })}
            className="lt-btn-secondary !py-1.5"
            rel="next"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
