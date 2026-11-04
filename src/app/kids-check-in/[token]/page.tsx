import { notFound } from "next/navigation";
import { PublicKidsCheckInForm } from "@/components/kids/public-kids-check-in";
import { getKidsSessionByToken } from "@/lib/kids/service";

type Params = Promise<{ token: string }>;

export default async function PublicKidsCheckInPage({
  params,
}: {
  params: Params;
}) {
  const { token } = await params;
  const session = await getKidsSessionByToken(token);
  if (!session) notFound();

  return (
    <main className="lt-canvas min-h-screen px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Living Testimonies · Children’s ministry
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--lt-ink)]">
            {session.label}
          </h1>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            {session.branch.name}
            {session.room ? ` · ${session.room.name}` : ""}
            {!session.kioskEnabled ? " · closed" : ""}
          </p>
        </div>
        {session.kioskEnabled ? (
          <PublicKidsCheckInForm
            token={token}
            sessionLabel={session.label}
          />
        ) : (
          <p className="lt-panel p-5 text-center text-sm text-[var(--lt-muted)]">
            Children’s check-in is closed for this session.
          </p>
        )}
      </div>
    </main>
  );
}
