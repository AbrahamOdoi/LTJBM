/** Shared list pagination / URL query helpers for CDMS data tables. */

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type PageParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function parsePageParams(sp: {
  page?: string | string[] | undefined;
  pageSize?: string | string[] | undefined;
}): PageParams {
  const rawPage = first(sp.page);
  const rawSize = first(sp.pageSize);
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.parseInt(rawSize ?? String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
    ),
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function pageResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PageResult<T> {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  return {
    items,
    total,
    page: Math.min(page, pageCount),
    pageSize,
    pageCount,
  };
}

/** Build a query string from current filters, dropping empty values. */
export function buildSearchParams(
  current: Record<string, string | number | undefined | null>,
  overrides: Record<string, string | number | undefined | null> = {},
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "") continue;
    // Default page omitted so shareable URLs stay clean
    if (key === "page" && String(value) === "1") continue;
    if (key === "pageSize" && String(value) === String(DEFAULT_PAGE_SIZE)) {
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

export function hrefWithParams(
  pathname: string,
  current: Record<string, string | number | undefined | null>,
  overrides: Record<string, string | number | undefined | null> = {},
): string {
  const qs = buildSearchParams(current, overrides);
  return qs ? `${pathname}?${qs}` : pathname;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
