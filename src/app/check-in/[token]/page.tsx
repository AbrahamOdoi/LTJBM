import { notFound } from "next/navigation";
import { PublicCheckInForm } from "@/components/attendance/public-check-in-form";
import { getAttendanceSessionByToken } from "@/lib/attendance/service";

type Params = Promise<{ token: string }>;

export default async function PublicCheckInPage({
  params,
}: {
  params: Params;
}) {
  const { token } = await params;
  const session = await getAttendanceSessionByToken(token);
  if (!session) notFound();

  return (
    <main className="min-h-screen bg-[var(--lt-paper)] px-4 py-10">
      <div className="pointer-events-none fixed inset-0 opacity-[0.04]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='160' viewBox='0 0 120 160'%3E%3Cpath fill='%231A1D21' d='M55 20h10v50h30v10H65v60H55V80H25V70h30z'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "120px 160px",
          }}
        />
      </div>
      <div className="relative">
        {!session.kioskEnabled ? (
          <div className="mx-auto max-w-md lt-panel p-6 text-center">
            <h1 className="text-xl font-semibold text-[var(--lt-ink)]">
              Check-in closed
            </h1>
            <p className="mt-2 text-sm text-[var(--lt-muted)]">
              {session.label} is not accepting mobile check-ins right now.
            </p>
          </div>
        ) : (
          <PublicCheckInForm
            token={token}
            sessionLabel={`${session.label} · ${session.branch.name} · ${session.heldAt.toISOString().slice(0, 10)}`}
          />
        )}
      </div>
    </main>
  );
}
