import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CreatePastoralNoteForm } from "@/components/pastoral/create-note-form";
import { requirePastoralAccess } from "@/lib/auth-guards";
import { listPastoralNotes } from "@/lib/pastoral/service";

export default async function PastoralCarePage() {
  const session = await requirePastoralAccess().catch(() => null);
  if (!session) redirect("/login");

  const notes = await listPastoralNotes();

  return (
    <AppShell
      title="Pastoral care"
      subtitle="Prayer and visitation notes — restricted. Never linked to individual giving."
      role={session.user.role}
      userName={session.user.name}
      active="pastoral"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-3">
          {notes.length === 0 ? (
            <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
              No pastoral notes yet. Record a prayer request or visitation.
            </p>
          ) : (
            notes.map((n) => (
              <article key={n.id} className="lt-panel p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium text-[var(--lt-ink)]">{n.title}</h3>
                  <span className="text-xs text-[var(--lt-muted)]">
                    {n.kind} · {n.occurredOn.toISOString().slice(0, 10)}
                    {n.isPrivate ? " · private" : ""}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--lt-ink-soft)]">
                  {n.body}
                </p>
                <p className="mt-2 text-xs text-[var(--lt-muted)]">
                  {n.member
                    ? `${n.member.firstName} ${n.member.lastName}`
                    : "No member linked"}
                  {n.author ? ` · ${n.author.name}` : ""}
                </p>
              </article>
            ))
          )}
        </section>
        <CreatePastoralNoteForm />
      </div>
    </AppShell>
  );
}
