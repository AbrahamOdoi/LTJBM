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
          body: "Records Clerks, Branch Leaders, and other unauthorised roles cannot open contribution screens. Sign in as Financial Secretary or Data Centre Admin to continue the money walkthrough. Branches handle membership only.",
          nextHref: "/login",
          nextLabel: "Switch account",
        }
      : reason === "reporting"
        ? {
            title: "Board reports are role-gated",
            body: "Pastoral Board and Leadership Council see Expected / Paid / Outstanding only — never individual givers. Records Clerks and Branch Leaders stay on Members. Sign in as Board, Council, Financial Secretary, or Admin.",
            nextHref: "/login",
            nextLabel: "Switch account",
          }
        : reason === "admin"
          ? {
              title: "Data Centre restricted",
              body: "Dropdown lists, users, export, and backup are limited to Data Centre Admin accounts.",
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
      <div className="lt-enter max-w-lg">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[var(--lt-brass)] mb-2">
          Living Testimonies · Access
        </p>
        <h1 className="font-display text-3xl font-semibold text-[var(--lt-ink)] mb-3">
          {copy.title}
        </h1>
        <p className="text-[var(--lt-muted)] mb-6 leading-relaxed">{copy.body}</p>
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
