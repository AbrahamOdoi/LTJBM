import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateKidsSessionForm } from "@/components/kids/create-session-form";
import { requireAttendanceWrite } from "@/lib/auth-guards";
import { listAttendanceSessions } from "@/lib/attendance/service";
import { prisma } from "@/lib/db";
import { listKidsRooms } from "@/lib/kids/service";

export default async function NewKidsSessionPage() {
  const session = await requireAttendanceWrite().catch(() => null);
  if (!session) redirect("/login");

  const [branches, rooms, attendanceSessions] = await Promise.all([
    prisma.branch.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    listKidsRooms(),
    listAttendanceSessions(20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/attendance/kids" className="lt-link">
            Children’s check-in
          </Link>{" "}
          / new
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          New children’s session
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Opens a kiosk and QR check-in for guardians with secure pickup tags.
        </p>
      </div>
      <CreateKidsSessionForm
        branches={branches}
        rooms={rooms.map((r) => ({
          id: r.id,
          name: r.name,
          branchId: r.branchId,
        }))}
        attendanceSessions={attendanceSessions.map((s) => ({
          id: s.id,
          label: s.label,
          heldAt: s.heldAt.toISOString().slice(0, 10),
        }))}
      />
    </div>
  );
}
