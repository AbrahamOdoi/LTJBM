import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MembersAppShell } from "@/components/members/app-shell";
import { MemberForm } from "@/components/members/member-form";
import {
  BranchTransferForm,
  StatusChangeForm,
} from "@/components/members/status-transfer-forms";
import { requireMembersAccess } from "@/lib/auth-guards";
import { canWriteMembers } from "@/lib/roles";
import { getScopedBranchIds } from "@/lib/members/access";
import {
  changeMemberStatusAction,
  transferMemberAction,
  updateMemberAction,
} from "@/lib/members/actions";
import { photoPublicUrl } from "@/lib/members/photos";
import {
  getMemberDetail,
  listBranchesForUser,
  listCellsForBranches,
  listFellowships,
} from "@/lib/members/queries";

type Params = Promise<{ id: string }>;

export default async function MemberDetailPage({ params }: { params: Params }) {
  const session = await requireMembersAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const member = await getMemberDetail(session.user, id);
  if (!member) notFound();

  const writeOk = canWriteMembers(session.user.role);
  const scoped = await getScopedBranchIds(session.user);
  const [branches, cells, fellowships] = await Promise.all([
    listBranchesForUser(session.user),
    listCellsForBranches(scoped),
    listFellowships(),
  ]);

  const activeCell = member.groups.find((g) => g.kind === "Cell");
  const activeFellowship = member.groups.find((g) => g.kind === "Fellowship");
  const householdLink = member.households[0];
  const dob = member.dateOfBirth
    ? member.dateOfBirth.toISOString().slice(0, 10)
    : null;

  return (
    <MembersAppShell
      title={`${member.firstName} ${member.lastName}`}
      subtitle={`${member.memberNumber ?? "No number"} · ${member.branch.name} · ${member.status}`}
      role={session.user.role}
      userName={session.user.name}
    >
      <div className="flex flex-wrap gap-2 print:hidden">
        <Link
          href={`/members/${member.id}/print`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Print individual
        </Link>
        <Link
          href="/members"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Back to list
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <MemberForm
          mode="edit"
          action={updateMemberAction}
          readOnly={!writeOk}
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
          initial={{
            memberId: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            otherNames: member.otherNames,
            dateOfBirth: dob,
            gender: member.gender,
            phone: member.phone,
            email: member.email,
            addressLine1: member.addressLine1,
            addressLine2: member.addressLine2,
            city: member.city,
            region: member.region,
            country: member.country,
            branchId: member.branchId,
            cellId: activeCell?.cellId ?? null,
            fellowshipMinistryId: activeFellowship?.fellowshipMinistryId ?? null,
            householdName: householdLink?.household.name ?? null,
            householdRelation: householdLink?.relation ?? "Head",
            photoUrl: photoPublicUrl(member.photoKey),
          }}
        />

        <aside className="space-y-4 print:hidden">
          {writeOk ? (
            <>
              <StatusChangeForm
                memberId={member.id}
                currentStatus={member.status}
                action={changeMemberStatusAction}
              />
              <BranchTransferForm
                memberId={member.id}
                currentBranchId={member.branchId}
                branches={branches.map((b) => ({
                  id: b.id,
                  label: `${b.name} · ${b.country}${b.isInternational ? " (intl)" : ""}`,
                }))}
                action={transferMemberAction}
              />
            </>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-800">Household</h3>
            {householdLink ? (
              <ul className="space-y-1 text-sm">
                <li className="text-slate-500">{householdLink.household.name}</li>
                {householdLink.household.members.map((hm) => (
                  <li key={hm.id}>
                    <Link
                      href={`/members/${hm.member.id}`}
                      className="text-sky-800 hover:underline"
                    >
                      {hm.member.firstName} {hm.member.lastName}
                    </Link>
                    <span className="text-slate-500"> · {hm.relation}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No household linked.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-800">Change history</h3>
            <ul className="space-y-3 text-sm">
              {member.statusHistory.map((h) => (
                <li key={h.id} className="border-b border-slate-100 pb-2 last:border-0">
                  <div className="font-medium">
                    {h.fromStatus ?? "—"} → {h.toStatus}
                  </div>
                  {(h.fromBranch || h.toBranch) && (
                    <div className="text-slate-600">
                      {h.fromBranch?.name ?? "—"} → {h.toBranch?.name ?? "—"}
                      {h.toBranch?.country ? ` (${h.toBranch.country})` : ""}
                    </div>
                  )}
                  {h.reason ? (
                    <div className="text-slate-500">{h.reason}</div>
                  ) : null}
                  <div className="text-xs text-slate-400">
                    {h.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                    {h.changedBy ? ` · ${h.changedBy.name}` : ""}
                  </div>
                </li>
              ))}
              {member.statusHistory.length === 0 ? (
                <li className="text-slate-500">No history yet.</li>
              ) : null}
            </ul>
          </section>
        </aside>
      </div>
    </MembersAppShell>
  );
}
