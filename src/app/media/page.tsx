import Link from "next/link";
import { redirect } from "next/navigation";
import { SeriesForm } from "@/components/media/series-form";
import { requireMediaAccess } from "@/lib/auth-guards";
import { buildSearchParams, parsePageParams } from "@/lib/data-table";
import { listSermonSeries, listSermons } from "@/lib/media/service";
import { canWriteMedia } from "@/lib/roles";

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    seriesId?: string;
    preacher?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const session = await requireMediaAccess().catch(() => null);
  if (!session) redirect("/login");

  const params = await searchParams;
  const { page, pageSize } = parsePageParams(params);
  const q = params.q?.trim() || undefined;
  const seriesId = params.seriesId || undefined;
  const preacher = params.preacher?.trim() || undefined;

  const [result, series] = await Promise.all([
    listSermons({ q, seriesId, preacher, page, pageSize }),
    listSermonSeries(true),
  ]);
  const writeOk = canWriteMedia(session.user.role);
  const qs = (extra: Record<string, string | undefined>) =>
    buildSearchParams(
      {
        q,
        seriesId,
        preacher,
        page,
        pageSize,
      },
      extra,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Sermon library
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
            Browse and search messages by title, preacher, scripture, or series.
            Published sermons appear on the member portal.
          </p>
        </div>
        {writeOk ? (
          <Link href="/media/new" className="lt-btn-primary">
            Add sermon
          </Link>
        ) : null}
      </div>

      <form className="lt-panel flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="text-sm">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Title, scripture…"
            className="mt-1 block w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Preacher
          <input
            name="preacher"
            defaultValue={preacher ?? ""}
            className="mt-1 block w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Series
          <select
            name="seriesId"
            defaultValue={seriesId ?? ""}
            className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All series</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="lt-btn-secondary">
          Filter
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="lt-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Preacher</th>
                <th className="px-4 py-3 font-medium">Scripture</th>
                <th className="px-4 py-3 font-medium">Series</th>
                <th className="px-4 py-3 font-medium">Portal</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--lt-muted)]"
                  >
                    No sermons match these filters.
                  </td>
                </tr>
              ) : (
                result.items.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 tabular-nums text-[var(--lt-muted)]">
                      {s.preachedAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/media/${s.id}`}
                        className="font-medium text-[var(--lt-ink)] hover:underline"
                      >
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{s.preacher}</td>
                    <td className="px-4 py-3">{s.scripture ?? "—"}</td>
                    <td className="px-4 py-3">{s.series?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {s.publishedToPortal ? "Yes" : "No"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {result.pageCount > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
              <span className="text-[var(--lt-muted)]">
                Page {result.page} of {result.pageCount} · {result.total} sermons
              </span>
              <div className="flex gap-2">
                {result.page > 1 ? (
                  <Link
                    href={`/media?${qs({ page: String(result.page - 1) })}`}
                    className="lt-btn-secondary"
                  >
                    Previous
                  </Link>
                ) : null}
                {result.page < result.pageCount ? (
                  <Link
                    href={`/media?${qs({ page: String(result.page + 1) })}`}
                    className="lt-btn-secondary"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {writeOk ? (
          <div className="space-y-4">
            <SeriesForm />
            <ul className="lt-panel space-y-2 p-4 text-sm">
              <li className="font-medium text-[var(--lt-ink)]">Series</li>
              {series.map((s) => (
                <li key={s.id} className="text-[var(--lt-muted)]">
                  {s.name}{" "}
                  <span className="tabular-nums">({s._count.sermons})</span>
                </li>
              ))}
              {series.length === 0 ? (
                <li className="text-[var(--lt-muted)]">No series yet.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
