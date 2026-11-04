import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireEventsAccess } from "@/lib/auth-guards";
import { canWriteEvents } from "@/lib/roles";
import { registerEventAction } from "@/lib/events/actions";
import { getChurchEvent } from "@/lib/events/service";

type Params = Promise<{ id: string }>;

export default async function EventDetailPage({ params }: { params: Params }) {
  const session = await requireEventsAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const event = await getChurchEvent(id);
  if (!event) notFound();
  const writeOk = canWriteEvents(session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/events" className="lt-link">
            Events
          </Link>{" "}
          / detail
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          {event.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          {event.startsAt.toISOString().replace("T", " ").slice(0, 16)}
          {event.endsAt
            ? ` → ${event.endsAt.toISOString().replace("T", " ").slice(0, 16)}`
            : ""}
          {event.location ? ` · ${event.location}` : ""}
          {event.branch ? ` · ${event.branch.name}` : ""}
        </p>
        {event.description ? (
          <p className="mt-3 text-sm text-[var(--lt-ink-soft)]">{event.description}</p>
        ) : null}
      </div>

      {writeOk ? (
        <form action={registerEventAction} className="lt-panel grid gap-3 p-4 sm:grid-cols-2">
          <h3 className="sm:col-span-2 text-sm font-medium">Light registration</h3>
          <input type="hidden" name="eventId" value={event.id} />
          <label className="text-sm">
            Name
            <input
              name="name"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Phone
            <input
              name="phone"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Email
            <input
              type="email"
              name="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <button type="submit" className="lt-btn-primary sm:col-span-2 w-fit">
            Register
          </button>
        </form>
      ) : null}

      <section className="lt-panel">
        <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
          Registrations ({event.registrations.length}
          {event.capacity ? ` / ${event.capacity}` : ""})
        </h3>
        {event.registrations.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">None yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {event.registrations.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <span className="font-medium">{r.name}</span>
                <span className="text-[var(--lt-muted)]">
                  {r.phone ? ` · ${r.phone}` : ""}
                  {r.email ? ` · ${r.email}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
