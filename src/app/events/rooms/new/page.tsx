import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateRoomForm } from "@/components/facilities/room-forms";
import { requireEventsWrite } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function NewRoomPage() {
  const session = await requireEventsWrite().catch(() => null);
  if (!session) redirect("/login");

  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/events/rooms" className="lt-link">
            Rooms
          </Link>{" "}
          / new
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Add facility room
        </h2>
      </div>
      <CreateRoomForm
        branches={branches.map((b) => ({
          id: b.id,
          label: `${b.name} (${b.code})`,
        }))}
      />
    </div>
  );
}
