import Link from "next/link";
import { redirect } from "next/navigation";
import { MembersAppShell } from "@/components/members/app-shell";
import { requireMembersAccess } from "@/lib/auth-guards";
import { listUpcomingMilestones } from "@/lib/members/enrichment";

export default async function MilestonesPage() {
  const session = await requireMembersAccess().catch(() => null);
  if (!session) redirect("/login");

  const { milestones, birthdays } = await listUpcomingMilestones(45);

  return (
    <MembersAppShell
      title="Milestones & birthdays"
      subtitle="Upcoming recorded milestones and birthdays in the next 45 days."
      role={session.user.role}
      userName={session.user.name}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="lt-panel p-5 space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Recorded milestones
          </h2>
          {milestones.length === 0 ? (
            <p className="text-sm text-[var(--lt-muted)]">None in this window.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {milestones.map((m) => (
                <li key={m.id} className="border-b border-slate-100 pb-2 last:border-0">
                  <Link href={`/members/${m.member.id}`} className="font-medium hover:underline">
                    {m.member.firstName} {m.member.lastName}
                  </Link>
                  <span className="text-[var(--lt-muted)]">
                    {" "}
                    · {m.kind}
                    {m.title ? ` · ${m.title}` : ""} ·{" "}
                    {m.occurredOn.toISOString().slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lt-panel p-5 space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Birthdays
          </h2>
          {birthdays.length === 0 ? (
            <p className="text-sm text-[var(--lt-muted)]">None in this window.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {birthdays.map((b) =>
                b ? (
                  <li key={b.member.id} className="border-b border-slate-100 pb-2 last:border-0">
                    <Link
                      href={`/members/${b.member.id}`}
                      className="font-medium hover:underline"
                    >
                      {b.member.firstName} {b.member.lastName}
                    </Link>
                    <span className="text-[var(--lt-muted)]">
                      {" "}
                      · {b.next.toISOString().slice(0, 10)}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </section>
      </div>
    </MembersAppShell>
  );
}
