import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { DataTablePagination } from "@/components/data-table/pagination";
import type { PageResult } from "@/lib/data-table";

type Column = {
  key: string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
};

type Props<T> = {
  columns: Column[];
  rows: T[];
  rowKey: (row: T) => string;
  renderCell: (row: T, columnKey: string) => ReactNode;
  /** When empty, show EmptyState instead of an empty tbody. */
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  /** Pagination footer; omit for non-paginated tables. */
  pagination?: {
    pathname: string;
    filters: Record<string, string | number | undefined | null>;
    result: Pick<
      PageResult<unknown>,
      "page" | "pageSize" | "pageCount" | "total"
    >;
    noun?: string;
  };
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  renderCell,
  emptyTitle = "No rows to show",
  emptyBody = "Try clearing filters or adjusting your search.",
  emptyActionHref,
  emptyActionLabel,
  pagination,
  className,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        actionHref={emptyActionHref}
        actionLabel={emptyActionLabel}
      />
    );
  }

  return (
    <div className={`lt-table-wrap ${className ?? ""}`.trim()}>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--lt-line)] bg-[#f3f7f5] text-[var(--lt-muted)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 font-medium ${col.headerClassName ?? col.className ?? ""}`.trim()}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="lt-row-hover border-b border-[var(--lt-line)]/70 last:border-0"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2.5 ${col.className ?? ""}`.trim()}
                >
                  {renderCell(row, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination ? (
        <DataTablePagination
          pathname={pagination.pathname}
          filters={pagination.filters}
          result={pagination.result}
          noun={pagination.noun}
        />
      ) : null}
    </div>
  );
}
