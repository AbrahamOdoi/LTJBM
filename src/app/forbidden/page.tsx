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
          title: "Contributions are Head Office only",
          body: "Records Clerks, Branch Leaders, and other unauthorised roles cannot open contribution screens. Sign in as Financial Secretary or Data Centre Admin to continue. Branches handle membership only.",
          nextHref: "/login",
          nextLabel: "Switch account",
        }
      : reason === "reporting"
        ? {
            title: "Reports are role-gated",
            body: "Pastoral Board and Leadership Council see Expected / Paid / Outstanding only — never individual givers. Contribution detail reports stay with Head Office.",
            nextHref: "/login",
            nextLabel: "Switch account",
          }
        : reason === "admin"
          ? {
              title: "Data Centre restricted",
              body: "Domains, users, export, and backup are limited to Data Centre Admin accounts.",
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
    <main className="lt-canvas flex items-center justify-center p-6">
      <div className="max-w-lg">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Access
        </p>
        <h1 className="mb-3 text-2xl font-semibold text-[var(--lt-ink)]">
          {copy.title}
        </h1>
        <p className="mb-6 text-[var(--lt-muted)] leading-relaxed">{copy.body}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={copy.nextHref} className="lt-btn-primary">
            {copy.nextLabel}
          </Link>
          <Link href="/" className="lt-btn-secondary">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
