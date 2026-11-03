import { redirect } from "next/navigation";
import { MembersAppShell } from "@/components/members/app-shell";
import { MemberForm } from "@/components/members/member-form";
import { AuthGuardError, requireMembersWrite } from "@/lib/auth-guards";
import { getScopedBranchIds } from "@/lib/members/access";
import { registerMemberAction } from "@/lib/members/actions";
import {
  listBranchesForUser,
  listCellsForBranches,
  listFellowships,
} from "@/lib/members/queries";

export default async function NewMemberPage() {
  let session;
  try {
    session = await requireMembersWrite();
  } catch (error) {
    if (error instanceof AuthGuardError && error.status === 401) {
      redirect("/login");
    }
    redirect("/members");
  }

  const scoped = await getScopedBranchIds(session.user);
  const [branches, cells, fellowships] = await Promise.all([
    listBranchesForUser(session.user),
    listCellsForBranches(scoped),
    listFellowships(),
  ]);

  return (
    <MembersAppShell
      title="Register member"
      subtitle="Creates biodata, optional household/cell/fellowship, runs deterministic duplicate checks."
      role={session.user.role}
      userName={session.user.name}
    >
      <MemberForm
        mode="create"
        action={registerMemberAction}
        branches={branches.map((b) => ({
          id: b.id,
          label: `${b.name} (${b.country})`,
        }))}
        cells={cells.map((c) => ({
          id: c.id,
          label: c.name,
          branchId: c.branchId,
        }))}
        fellowships={fellowships.map((f) => ({ id: f.id, label: f.name }))}
        initial={{ branchId: branches[0]?.id }}
      />
    </MembersAppShell>
  );
}
