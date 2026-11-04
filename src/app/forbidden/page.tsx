import Link from "next/link";

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason;
  const message =
    reason === "finance"
      ? "HQ finance is restricted. Records Clerks and other unauthorised roles cannot open finance routes or APIs."
      : reason === "reporting"
        ? "Board / Council reporting is role-gated. Records Clerks and Branch Leaders cannot open aggregated finance dashboards."
        : reason === "admin"
          ? "Admin / Data Centre console is restricted to Admin users."
          : "You do not have permission to view this page.";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-2">
          Access denied
        </p>
        <h1 className="text-2xl font-semibold mb-3">403 Forbidden</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">{message}</p>
        <Link
          href="/"
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
