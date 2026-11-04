import { redirect } from "next/navigation";
import { SermonForm } from "@/components/media/sermon-form";
import { requireMediaWrite } from "@/lib/auth-guards";
import { listSermonSeries } from "@/lib/media/service";

export default async function NewSermonPage() {
  const session = await requireMediaWrite().catch(() => null);
  if (!session) redirect("/login");

  const series = await listSermonSeries(true);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Add sermon
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Catalogue a message with preacher, date, scripture, and media links.
        </p>
      </div>
      <SermonForm
        series={series.map((s) => ({ id: s.id, name: s.name }))}
        initial={{
          preachedAt: new Date().toISOString().slice(0, 10),
          publishedToPortal: true,
        }}
      />
    </div>
  );
}
