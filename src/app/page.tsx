import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import {
  canAccessAdmin,
  canAccessFinance,
  canAccessMembers,
  canAccessReporting,
  canWriteMembers,
} from "@/lib/roles";

export default async function HomePage() {
  const session = await auth();
  const role = session?.user?.role;
  const financeOk = canAccessFinance(role);
  const reportingOk = canAccessReporting(role);
  const membersOk = canAccessMembers(role);
  const membersWrite = canWriteMembers(role);
  const adminOk = canAccessAdmin(role);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.18em] uppercase text-slate-500">
              LTJBM CDMS
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Church database
            </h1>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed max-w-xl">
              Phase A/B: platform auth, Members / biodata, HQ finance posting,
              Board/Council reporting, and Admin / Data Centre console (domains,
              users, export, backup narrative).
            </p>
          </div>
          <SignOutButton />
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
              <dd className="font-medium">{role}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Finance access</dt>
              <dd className="font-medium">{financeOk ? "Allowed" : "Denied"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Reporting access</dt>
              <dd className="font-medium">
                {reportingOk ? "Allowed" : "Denied"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Surfaces
          </h2>
          <ul className="space-y-2 text-sm">
            {membersOk ? (
              <li>
                <Link
                  href="/members"
                  className="text-sky-800 hover:underline font-medium"
                >
                  /members
                </Link>
                <span className="text-slate-500">
                  {" "}
                  — member register
                  {membersWrite ? ", update, transfer, print" : " (read)"}
                </span>
              </li>
            ) : null}
            {membersWrite ? (
              <li>
                <Link
                  href="/members/new"
                  className="text-sky-800 hover:underline font-medium"
                >
                  /members/new
                </Link>
                <span className="text-slate-500"> — register with duplicate checks</span>
              </li>
            ) : null}
            <li>
              <Link
                href="/finance"
                className="text-sky-800 hover:underline font-medium"
              >
                /finance
              </Link>
              <span className="text-slate-500">
                {" "}
                — HQ finance (obligations, batches, arrears)
              </span>
            </li>
            <li>
              <Link
                href="/reports"
                className="text-sky-800 hover:underline font-medium"
              >
                /reports
              </Link>
              <span className="text-slate-500">
                {" "}
                — Board / Council Expected · Paid · Outstanding
              </span>
            </li>
            {adminOk ? (
              <li>
                <Link
                  href="/admin"
                  className="text-sky-800 hover:underline font-medium"
                >
                  /admin
                </Link>
                <span className="text-slate-500">
                  {" "}
                  — domains, users, export, backup
                </span>
              </li>
            ) : null}
            <li>
              <span className="font-medium text-slate-800">/api/finance/health</span>
              <span className="text-slate-500">
                {" "}
                — finance API gate smoke check
              </span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
