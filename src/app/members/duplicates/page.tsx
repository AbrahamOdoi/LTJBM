import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { MembersAppShell } from "@/components/members/app-shell";
import { DuplicateReviewButtons } from "@/components/members/duplicate-review-buttons";
import { requireMembersAccess } from "@/lib/auth-guards";
import { canWriteMembers } from "@/lib/roles";
import { reviewDuplicateAction } from "@/lib/members/actions";
import { listPendingDuplicates } from "@/lib/members/queries";

export default async function DuplicatesPage() {
  const session = await requireMembersAccess().catch(() => null);
  if (!session) redirect("/login");

  const duplicates = await listPendingDuplicates(session.user);
  const writeOk = canWriteMembers(session.user.role);

  return (
    <MembersAppShell
      title="Duplicate candidates"
      subtitle="Deterministic matches on phone, email, and name + date of birth."
      role={session.user.role}
      userName={session.user.name}
    >
      <div className="space-y-3">
        {duplicates.map((d) => (
          <article
            key={d.id}
            className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                Score {d.score.toFixed(2)} · {d.reasons.join("; ")}
              </p>
              <p className="text-xs text-slate-500">
                {d.createdAt.toISOString().slice(0, 10)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {[d.memberA, d.memberB].map((m) => (
                <div key={m.id} className="rounded-md border border-slate-100 p-3">
                  <Link
                    href={`/members/${m.id}`}
                    className="font-medium text-sky-900 hover:underline"
                  >
                    {m.firstName} {m.lastName}
                  </Link>
                  <div className="text-slate-600">
                    {m.memberNumber} · {m.branch.name}
                  </div>
                  <div className="text-slate-500">
                    {m.phone || "no phone"} · {m.email || "no email"}
                  </div>
                </div>
              ))}
            </div>
            {writeOk ? (
              <DuplicateReviewButtons
                candidateId={d.id}
                action={reviewDuplicateAction}
              />
            ) : null}
          </article>
        ))}
        {duplicates.length === 0 ? (
          <EmptyState
            title="No pending duplicates"
            body="When registration finds a matching phone, email, or name + date of birth, candidates appear here for review."
            actionHref={writeOk ? "/members/new" : undefined}
            actionLabel={writeOk ? "Register another member" : undefined}
          />
        ) : null}
      </div>
    </MembersAppShell>
  );
}
