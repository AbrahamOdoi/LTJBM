import Link from "next/link";
import { redirect } from "next/navigation";
import { requireEventsAccess } from "@/lib/auth-guards";
import { canWriteEvents } from "@/lib/roles";
import {
  listFacilityRooms,
  listUpcomingBookings,
} from "@/lib/facilities/service";

export default async function RoomsPage() {
  const session = await requireEventsAccess().catch(() => null);
  if (!session) redirect("/login");

  const writeOk = canWriteEvents(session.user.role);
  const [rooms, bookings] = await Promise.all([
    listFacilityRooms({ activeOnly: false }),
    listUpcomingBookings(20),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Rooms & bookings
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Facility rooms for church events and meetings. Volunteer scheduling stays
            out of scope.
          </p>
        </div>
        {writeOk ? (
          <Link href="/events/rooms/new" className="lt-btn-primary">
            Add room
          </Link>
        ) : null}
      </div>

      <section className="lt-panel overflow-x-auto">
        <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
          Rooms
        </h3>
        {rooms.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">
            No rooms yet. Add the sanctuary, halls, or cell meeting spaces.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/events/rooms/${r.id}`} className="lt-link font-medium">
                      {r.name}
                    </Link>
                    {r.location ? (
                      <span className="text-[var(--lt-muted)]"> · {r.location}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{r.branch?.name ?? "All / HQ"}</td>
                  <td className="px-4 py-3">{r.capacity ?? "—"}</td>
                  <td className="px-4 py-3">{r._count.bookings}</td>
                  <td className="px-4 py-3">{r.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="lt-panel overflow-x-auto">
        <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
          Upcoming bookings
        </h3>
        {bookings.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">No upcoming bookings.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {bookings.map((b) => (
              <li key={b.id} className="px-4 py-3">
                <div className="font-medium text-[var(--lt-ink)]">{b.title}</div>
                <div className="text-[var(--lt-muted)]">
                  {b.room.name}
                  {b.room.branch ? ` · ${b.room.branch.name}` : ""}
                  {" · "}
                  {b.startsAt.toISOString().replace("T", " ").slice(0, 16)}
                  {" – "}
                  {b.endsAt.toISOString().replace("T", " ").slice(0, 16)}
                  {b.event ? ` · event: ${b.event.title}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
