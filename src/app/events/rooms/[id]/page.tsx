import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreateBookingForm } from "@/components/facilities/room-forms";
import { requireEventsAccess } from "@/lib/auth-guards";
import { canWriteEvents } from "@/lib/roles";
import { getFacilityRoom } from "@/lib/facilities/service";
import { listRecentEvents } from "@/lib/events/service";

type Params = Promise<{ id: string }>;

export default async function RoomDetailPage({ params }: { params: Params }) {
  const session = await requireEventsAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const room = await getFacilityRoom(id);
  if (!room) notFound();

  const writeOk = canWriteEvents(session.user.role);
  const events = writeOk ? await listRecentEvents(30) : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/events/rooms" className="lt-link">
            Rooms
          </Link>{" "}
          / {room.name}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          {room.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          {room.branch?.name ?? "Shared / HQ"}
          {room.capacity != null ? ` · capacity ${room.capacity}` : ""}
          {room.location ? ` · ${room.location}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="lt-panel overflow-x-auto">
          <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
            Bookings
          </h3>
          {room.bookings.length === 0 ? (
            <p className="p-4 text-sm text-[var(--lt-muted)]">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {room.bookings.map((b) => (
                <li key={b.id} className="px-4 py-3">
                  <div className="font-medium">{b.title}</div>
                  <div className="text-[var(--lt-muted)]">
                    {b.startsAt.toISOString().replace("T", " ").slice(0, 16)}
                    {" – "}
                    {b.endsAt.toISOString().replace("T", " ").slice(0, 16)}
                    {b.bookedBy ? ` · ${b.bookedBy}` : ""}
                    {b.event ? ` · ${b.event.title}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {writeOk ? (
          <CreateBookingForm
            roomId={room.id}
            events={events.map((e) => ({
              id: e.id,
              label: `${e.title} · ${e.startsAt.toISOString().slice(0, 10)}`,
            }))}
          />
        ) : null}
      </div>
    </div>
  );
}
