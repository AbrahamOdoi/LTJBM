import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GroupAnnounceForm } from "@/components/groups/group-announce-form";
import { GroupLeaderForm } from "@/components/groups/group-leader-form";
import { GroupMeetingForm } from "@/components/groups/group-meeting-form";
import { GroupRosterPanel } from "@/components/groups/group-roster-panel";
import { requireGroupsAccess } from "@/lib/auth-guards";
import { ministryGroupKindLabel } from "@/lib/church-labels";
import {
  endLeaderAction,
  syncRosterFromLegacyAction,
} from "@/lib/groups/actions";
import {
  getMinistryGroup,
  syncRosterFromLegacyMemberships,
} from "@/lib/groups/service";
import { canWriteGroups } from "@/lib/roles";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireGroupsAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  await syncRosterFromLegacyMemberships(id);
  const group = await getMinistryGroup(id);
  if (!group) notFound();

  const writeOk = canWriteGroups(session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/groups" className="lt-link text-sm">
          ← All groups
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          {group.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          {ministryGroupKindLabel(group.kind)}
          {group.branch ? ` · ${group.branch.name}` : " · HQ / all branches"}
          {group.cell ? ` · linked cell` : ""}
          {group.fellowshipMinistry
            ? ` · linked ${group.fellowshipMinistry.name}`
            : ""}
        </p>
        {group.description ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--lt-ink-soft)]">
            {group.description}
          </p>
        ) : null}
        {writeOk && (group.cellId || group.fellowshipMinistryId) ? (
          <form action={syncRosterFromLegacyAction} className="mt-3">
            <input type="hidden" name="groupId" value={group.id} />
            <button type="submit" className="lt-btn-secondary">
              Refresh roster from memberships
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GroupRosterPanel
          groupId={group.id}
          branchId={group.branchId}
          writeOk={writeOk}
          roster={group.roster}
        />

        <section className="lt-panel space-y-4 p-5">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
              Leaders
            </h3>
            <p className="mt-1 text-sm text-[var(--lt-muted)]">
              Group / cell / fellowship leaders (separate from Branch Leader RBAC).
            </p>
          </div>
          {group.leaders.length === 0 ? (
            <p className="text-sm text-[var(--lt-muted)]">No leaders assigned.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {group.leaders.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div>
                    <div className="font-medium">
                      {l.member.lastName}, {l.member.firstName}
                    </div>
                    <div className="text-xs text-[var(--lt-muted)]">
                      {[l.title, l.member.phone].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {writeOk ? (
                    <form action={endLeaderAction}>
                      <input type="hidden" name="leaderId" value={l.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <button type="submit" className="lt-btn-secondary">
                        End
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {writeOk ? (
            <GroupLeaderForm
              groupId={group.id}
              branchId={group.branchId}
              rosterMembers={group.roster.map((r) => r.member)}
            />
          ) : null}
        </section>

        <section className="lt-panel space-y-4 p-5">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
              Meeting logs
            </h3>
            <p className="mt-1 text-sm text-[var(--lt-muted)]">
              Record group meetings (distinct from service attendance sessions).
            </p>
          </div>
          {group.meetings.length === 0 ? (
            <p className="text-sm text-[var(--lt-muted)]">No meetings logged yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {group.meetings.map((m) => (
                <li key={m.id} className="py-2">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-[var(--lt-muted)]">
                    {m.heldAt.toISOString().slice(0, 10)}
                    {m.location ? ` · ${m.location}` : ""}
                    {m.attendanceCount != null
                      ? ` · ${m.attendanceCount} present`
                      : ""}
                    {m.recordedBy ? ` · ${m.recordedBy.name}` : ""}
                  </div>
                  {m.notes ? (
                    <p className="mt-1 text-[var(--lt-ink-soft)]">{m.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {writeOk ? <GroupMeetingForm groupId={group.id} /> : null}
        </section>

        <section className="lt-panel space-y-4 p-5">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
              Group communication
            </h3>
            <p className="mt-1 text-sm text-[var(--lt-muted)]">
              In-app announcements with stub outbox (same pipeline as Data Centre
              communications).
            </p>
          </div>
          {group.announcements.length === 0 ? (
            <p className="text-sm text-[var(--lt-muted)]">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {group.announcements.map((a) => (
                <li key={a.id} className="py-2">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-[var(--lt-muted)]">
                    {a.createdAt.toISOString().replace("T", " ").slice(0, 16)} ·{" "}
                    {a.channel}
                    {a.outboxLogged ? " · outbox stubbed" : " · in-app only"}
                    {a.createdBy ? ` · ${a.createdBy.name}` : ""}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--lt-ink-soft)]">
                    {a.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {writeOk ? <GroupAnnounceForm groupId={group.id} /> : null}
        </section>
      </div>
    </div>
  );
}
