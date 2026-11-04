import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { SceneBanner } from "@/components/scene-banner";
import {
  accessModeLabel,
  roleLabel,
  roleNavItems,
} from "@/lib/role-labels";
import {
  canAccessAdmin,
  canAccessFinance,
  canAccessMembers,
  canAccessReporting,
  canWriteMembers,
  isRecordsClerk,
} from "@/lib/roles";

export default async function HomePage() {
  const session = await auth();
  const role = session?.user?.role;
  const financeOk = canAccessFinance(role);
  const reportingOk = canAccessReporting(role);
  const membersOk = canAccessMembers(role);
  const membersWrite = canWriteMembers(role);
  const adminOk = canAccessAdmin(role);
  const surfaces = roleNavItems(role).filter((item) => item.surface !== "home");

  return (
    <AppShell
      title={`Welcome${session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
      subtitle="Open the tools your role allows. Contributions stay at Head Office; Records Clerks use Members and membership Reports only."
      role={role}
      userName={session?.user?.name}
      active="home"
    >
      <SceneBanner
        scene="gathering"
        density="strip"
        caption="Ministry tools for your role — church photography and calm product chrome"
      />

      <section className="lt-panel space-y-3 p-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Signed in
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--lt-muted)]">Name</dt>
            <dd className="font-medium text-[var(--lt-ink)]">
              {session?.user?.name}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--lt-muted)]">Email</dt>
            <dd className="font-medium text-[var(--lt-ink)]">
              {session?.user?.email}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--lt-muted)]">Role</dt>
            <dd className="font-medium text-[var(--lt-ink)]">{roleLabel(role)}</dd>
          </div>
          <div>
            <dt className="text-[var(--lt-muted)]">Access</dt>
            <dd className="text-[var(--lt-ink-soft)]">
              {[
                membersOk
                  ? accessModeLabel(role, "members")
                  : "No member register",
                financeOk
                  ? accessModeLabel(role, "finance")
                  : "No Contributions access",
                reportingOk
                  ? accessModeLabel(role, "reports")
                  : "No Reports access",
                adminOk ? accessModeLabel(role, "admin") : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </dd>
          </div>
        </dl>
        {isRecordsClerk(role) ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            As Records Clerk you work in <strong>Members</strong> and membership{" "}
            <strong>Reports</strong>. Contributions stay closed at Head Office —
            that is intentional.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Your tools
        </h2>
        {surfaces.length === 0 ? (
          <p className="text-sm text-[var(--lt-muted)]">
            No tools are available for this account. Contact Data Centre.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {surfaces.map((item) => {
              const scene =
                item.surface === "members"
                  ? "community"
                  : item.surface === "finance"
                    ? "hands"
                    : item.surface === "reports"
                      ? "board"
                      : item.surface === "admin"
                        ? "workspace"
                        : "gathering";
              return (
                <li key={item.href} className="lt-card-appear">
                  <Link
                    href={item.href}
                    className="lt-panel block h-full overflow-hidden hover:border-[var(--lt-accent)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/images/scenes/${scene}.jpg`}
                      alt=""
                      className="h-24 w-full object-cover"
                    />
                    <span className="block p-4">
                      <span className="font-medium text-[var(--lt-ink)]">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--lt-muted)]">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {membersWrite ? (
        <section className="rounded-lg border border-dashed border-[var(--lt-line-strong)] bg-white p-4 text-sm text-[var(--lt-ink-soft)]">
          <p className="font-medium text-[var(--lt-ink)]">Quick start</p>
          <p className="mt-1">
            Register a member with household, cell, and fellowship ministry,
            then review{" "}
            <Link href="/members/duplicates" className="lt-link">
              possible duplicates
            </Link>
            .
          </p>
          <Link href="/members/new" className="lt-btn-primary mt-3">
            Register member
          </Link>
        </section>
      ) : null}
    </AppShell>
  );
}
