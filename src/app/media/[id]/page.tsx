import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SermonForm } from "@/components/media/sermon-form";
import { requireMediaAccess } from "@/lib/auth-guards";
import { getSermon, listSermonSeries } from "@/lib/media/service";
import { canWriteMedia } from "@/lib/roles";

export default async function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireMediaAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const sermon = await getSermon(id);
  if (!sermon) notFound();

  const writeOk = canWriteMedia(session.user.role);
  const series = writeOk ? await listSermonSeries(true) : [];
  const upload =
    sermon.uploadMeta && typeof sermon.uploadMeta === "object"
      ? (sermon.uploadMeta as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/media" className="hover:underline">
            Sermon library
          </Link>
          {" / "}
          {sermon.title}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          {sermon.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          {sermon.preacher} · {sermon.preachedAt.toISOString().slice(0, 10)}
          {sermon.scripture ? ` · ${sermon.scripture}` : ""}
          {sermon.series ? ` · ${sermon.series.name}` : ""}
        </p>
      </div>

      <section className="lt-panel space-y-3 p-5 text-sm">
        {sermon.summary ? <p>{sermon.summary}</p> : null}
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-[var(--lt-muted)]">Audio</dt>
            <dd>
              {sermon.audioUrl ? (
                <a
                  href={sermon.audioUrl}
                  className="lt-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open audio
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--lt-muted)]">Video</dt>
            <dd>
              {sermon.videoUrl ? (
                <a
                  href={sermon.videoUrl}
                  className="lt-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open video
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--lt-muted)]">Portal</dt>
            <dd>{sermon.publishedToPortal ? "Published" : "Staff only"}</dd>
          </div>
          {upload?.fileName ? (
            <div>
              <dt className="text-[var(--lt-muted)]">Upload</dt>
              <dd>
                {String(upload.fileName)}
                {upload.storageKey ? ` (${String(upload.storageKey)})` : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {writeOk ? (
        <SermonForm
          series={series.map((s) => ({ id: s.id, name: s.name }))}
          initial={{
            id: sermon.id,
            title: sermon.title,
            preacher: sermon.preacher,
            preachedAt: sermon.preachedAt.toISOString().slice(0, 10),
            scripture: sermon.scripture,
            seriesId: sermon.seriesId,
            audioUrl: sermon.audioUrl,
            videoUrl: sermon.videoUrl,
            summary: sermon.summary,
            publishedToPortal: sermon.publishedToPortal,
            uploadFileName:
              typeof upload?.fileName === "string" ? upload.fileName : "",
            uploadMimeType:
              typeof upload?.mimeType === "string" ? upload.mimeType : "",
            uploadStorageKey:
              typeof upload?.storageKey === "string" ? upload.storageKey : "",
            uploadSizeBytes:
              typeof upload?.sizeBytes === "number"
                ? String(upload.sizeBytes)
                : "",
          }}
        />
      ) : null}
    </div>
  );
}
