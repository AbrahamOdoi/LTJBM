import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requirePortalAccess } from "@/lib/auth-guards";
import { listSermons } from "@/lib/media/service";

export default async function PortalSermonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePortalAccess().catch(() => null);
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const result = await listSermons({
    q,
    publishedOnly: true,
    page: 1,
    pageSize: 50,
  });

  return (
    <AppShell
      title="My portal"
      subtitle="Published sermons from Living Testimonies — read only."
      role={session.user.role}
      userName={session.user.name}
      active="portal"
      subNav={[
        { href: "/portal", label: "My profile" },
        { href: "/portal/statement", label: "My statement" },
        { href: "/portal/sermons", label: "Sermons" },
        { href: "/give", label: "Give online" },
      ]}
    >
      <div className="space-y-4">
        <form method="get" className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search sermons…"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="lt-btn-secondary">
            Search
          </button>
        </form>

        <div className="lt-panel divide-y divide-slate-100">
          {result.items.length === 0 ? (
            <p className="p-5 text-sm text-[var(--lt-muted)]">
              No published sermons yet.
            </p>
          ) : (
            result.items.map((s) => (
              <article key={s.id} className="space-y-1 p-4">
                <h3 className="font-medium text-[var(--lt-ink)]">{s.title}</h3>
                <p className="text-sm text-[var(--lt-muted)]">
                  {s.preacher} · {s.preachedAt.toISOString().slice(0, 10)}
                  {s.scripture ? ` · ${s.scripture}` : ""}
                  {s.series ? ` · ${s.series.name}` : ""}
                </p>
                {s.summary ? (
                  <p className="text-sm text-[var(--lt-ink-soft)]">{s.summary}</p>
                ) : null}
                <div className="flex flex-wrap gap-3 text-sm">
                  {s.audioUrl ? (
                    <a
                      href={s.audioUrl}
                      className="lt-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Audio
                    </a>
                  ) : null}
                  {s.videoUrl ? (
                    <a
                      href={s.videoUrl}
                      className="lt-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Video
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>

        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/portal" className="lt-link">
            Back to my profile
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
