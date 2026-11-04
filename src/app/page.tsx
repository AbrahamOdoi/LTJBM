import Link from "next/link";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.18em] uppercase text-slate-500">
              LTJBM CDMS
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Your workspace
            </h1>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed max-w-xl">
              Open only the surfaces your role allows. Finance stays HQ-only;
              Records Clerks never see financial data.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <AppNav role={role} active="home" />
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white/80 p-5 space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Signed in
          </h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium">{session?.user?.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium">{session?.user?.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium">{roleLabel(role)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Access summary</dt>
              <dd className="font-medium text-slate-800">
                {[
                  membersOk
                    ? accessModeLabel(role, "members")
                    : "No member register",
                  financeOk
                    ? accessModeLabel(role, "finance")
                    : "No finance access",
                  reportingOk
                    ? accessModeLabel(role, "reports")
                    : "No reporting access",
                  adminOk ? accessModeLabel(role, "admin") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
          </dl>
          {isRecordsClerk(role) ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              As Records Clerk you work in <strong>Members</strong> only.
              Opening Finance or Reports will show Access denied — that is
              intentional for the demo.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Go to
          </h2>
          {surfaces.length === 0 ? (
            <p className="text-sm text-slate-600">
              No surfaces are available for this account. Contact Data Centre.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {surfaces.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block h-full rounded-xl border border-slate-200 bg-white/90 p-4 hover:border-sky-300"
                  >
                    <span className="font-medium text-slate-900">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {item.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {membersWrite ? (
          <section className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Quick start</p>
            <p className="mt-1">
              Register a member with household and groups, then review{" "}
              <Link href="/members/duplicates" className="text-sky-800 hover:underline">
                duplicate candidates
              </Link>
              .
            </p>
            <Link
              href="/members/new"
              className="mt-3 inline-flex rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              Register member
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}
