import Link from "next/link";
import { redirect } from "next/navigation";
import { MembersAppShell } from "@/components/members/app-shell";
import { requireMembersAccess } from "@/lib/auth-guards";
import { canWriteMembers } from "@/lib/roles";
import {
  listOpenFollowUps,
  updateFollowUpAction,
} from "@/lib/members/enrichment";

export default async function VisitorFollowUpsPage() {
  const session = await requireMembersAccess().catch(() => null);
  if (!session) redirect("/login");

  const followUps = await listOpenFollowUps();
  const writeOk = canWriteMembers(session.user.role);

  return (
    <MembersAppShell
      title="Visitor follow-ups"
      subtitle="First-timers and visitors needing a pastoral or hospitality touch."
      role={session.user.role}
      userName={session.user.name}
    >
      {followUps.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No open follow-ups. Register someone as a visitor or open follow-up from
          their member record.
        </p>
      ) : (
        <ul className="space-y-3">
          {followUps.map((f) => (
            <li key={f.id} className="lt-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/members/${f.member.id}`}
                    className="font-medium text-[var(--lt-ink)] hover:underline"
                  >
                    {f.member.firstName} {f.member.lastName}
                  </Link>
                  <p className="text-sm text-[var(--lt-muted)]">
                    {f.member.memberNumber ?? "No number"} · {f.member.branch.name}
                    {f.member.phone ? ` · ${f.member.phone}` : ""}
                  </p>
                  {f.notes ? (
                    <p className="mt-2 text-sm text-[var(--lt-ink-soft)]">{f.notes}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--lt-muted)]">
                    Status: {f.status}
                    {f.nextActionOn
                      ? ` · next action ${f.nextActionOn.toISOString().slice(0, 10)}`
                      : ""}
                    {f.assignedTo ? ` · ${f.assignedTo.name}` : ""}
                  </p>
                </div>
                {writeOk ? (
                  <form action={updateFollowUpAction} className="flex flex-wrap gap-2 text-sm">
                    <input type="hidden" name="followUpId" value={f.id} />
                    <input type="hidden" name="notes" value={f.notes ?? ""} />
                    <select
                      name="status"
                      defaultValue={f.status}
                      className="rounded-md border border-slate-300 px-2 py-1.5"
                    >
                      <option value="Open">Open</option>
                      <option value="InProgress">In progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <input
                      type="date"
                      name="nextActionOn"
                      defaultValue={
                        f.nextActionOn
                          ? f.nextActionOn.toISOString().slice(0, 10)
                          : ""
                      }
                      className="rounded-md border border-slate-300 px-2 py-1.5"
                    />
                    <button type="submit" className="lt-btn-secondary">
                      Save
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </MembersAppShell>
  );
}
