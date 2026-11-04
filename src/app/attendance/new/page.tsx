import { redirect } from "next/navigation";
import { CreateSessionForm } from "@/components/attendance/create-session-form";
import { requireAttendanceWrite } from "@/lib/auth-guards";
import {
  listBranchesForUser,
  listCellsForBranches,
} from "@/lib/members/queries";
import { getScopedBranchIds } from "@/lib/members/access";

export default async function NewAttendanceSessionPage() {
  const session = await requireAttendanceWrite().catch(() => null);
  if (!session) redirect("/login");

  const scoped = await getScopedBranchIds(session.user);
  const [branches, cells] = await Promise.all([
    listBranchesForUser(session.user),
    listCellsForBranches(scoped),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          New attendance session
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Create a service or cell session, then mark members present.
        </p>
      </div>
      <CreateSessionForm
        branches={branches.map((b) => ({
          id: b.id,
          label: `${b.name} (${b.code})`,
        }))}
        cells={cells.map((c) => ({
          id: c.id,
          label: c.name,
          branchId: c.branchId,
        }))}
      />
    </div>
  );
}
