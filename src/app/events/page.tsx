import Link from "next/link";
import { redirect } from "next/navigation";
import { requireEventsAccess } from "@/lib/auth-guards";
import { canWriteEvents } from "@/lib/roles";
import { listRecentEvents } from "@/lib/events/service";

export default async function EventsPage() {
  const session = await requireEventsAccess().catch(() => null);
  if (!session) redirect("/login");

  const events = await listRecentEvents(40);
  const writeOk = canWriteEvents(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Church calendar
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Services, meetings, and special gatherings. Book rooms under Rooms.
            Volunteer scheduling stays out of scope.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/events/rooms" className="lt-btn-secondary">
            Rooms
          </Link>
          {writeOk ? (
            <Link href="/events/new" className="lt-btn-primary">
              Add event
            </Link>
          ) : null}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No events yet. Add a service, conference, or dedication date.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="lt-panel p-4">
              <Link href={`/events/${e.id}`} className="font-medium hover:underline">
                {e.title}
              </Link>
              <p className="mt-1 text-sm text-[var(--lt-muted)]">
                {e.startsAt.toISOString().replace("T", " ").slice(0, 16)}
                {e.location ? ` · ${e.location}` : ""}
                {e.branch ? ` · ${e.branch.name}` : ""}
                {" · "}
                {e._count.registrations} registered
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
