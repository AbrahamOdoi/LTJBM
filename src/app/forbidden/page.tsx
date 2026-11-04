import Link from "next/link";

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason;

  const copy =
    reason === "finance"
      ? {
          title: "Finance is HQ-only",
          body: "Records Clerks, Branch Leaders, and other unauthorised roles cannot open finance screens or APIs. Sign in as Financial Secretary or Admin to continue the money walkthrough.",
          nextHref: "/login",
          nextLabel: "Switch account",
        }
      : reason === "reporting"
        ? {
            title: "Reports are role-gated",
            body: "Board and Council dashboards show aggregated giving. Records Clerks and Branch Leaders stay on Members. Sign in as Pastoral Board, Leadership Council, Finance, or Admin.",
            nextHref: "/login",
            nextLabel: "Switch account",
          }
        : reason === "admin"
          ? {
              title: "Admin console restricted",
              body: "Domains, users, export, and backup are limited to Admin / Data Centre accounts.",
              nextHref: "/login",
              nextLabel: "Switch account",
            }
          : {
              title: "Access denied",
              body: "You do not have permission to view this page with the current account.",
              nextHref: "/",
              nextLabel: "Back to home",
            };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-2">
          Access denied
        </p>
        <h1 className="text-2xl font-semibold mb-3">{copy.title}</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">{copy.body}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={copy.nextHref}
            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            {copy.nextLabel}
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
