import { auth } from "@/auth";
import Link from "next/link";
import { canWriteFinance } from "@/lib/roles";

/**
 * HQ finance shell only — Finance workstream owns real obligation/payment UI.
 * Middleware already blocks RecordsClerk and other non-finance roles.
 */
export default async function FinancePage() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-500">
            HQ only
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
          <p className="mt-2 text-slate-600">
            Platform gate is live for role{" "}
            <span className="font-medium text-slate-900">{role}</span>. Domain
            screens (pledges, batches, arrears) will be added by the Finance
            workstream.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
          <p className="text-sm text-slate-500">Access</p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>Read / aggregated view: allowed for this session</li>
            <li>
              Write / reconcile:{" "}
              {canWriteFinance(role) ? "allowed" : "read-only for this role"}
            </li>
          </ul>
        </div>

        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
