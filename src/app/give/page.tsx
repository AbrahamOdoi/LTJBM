import Link from "next/link";
import { auth } from "@/auth";
import { GiveForm } from "@/components/giving/give-form";
import { getGivingProviderStatuses } from "@/lib/giving/service";
import { listOpenObligationsForMember } from "@/lib/giving/service";
import { prisma } from "@/lib/db";

export default async function GivePage() {
  const session = await auth();
  const providers = await getGivingProviderStatuses();
  const memberId = session?.user?.memberId ?? null;

  let memberNumber: string | null = null;
  let obligations: Awaited<ReturnType<typeof listOpenObligationsForMember>> = [];
  if (memberId) {
    const m = await prisma.member.findUnique({
      where: { id: memberId },
      select: { memberNumber: true, firstName: true },
    });
    memberNumber = m?.memberNumber ?? null;
    obligations = await listOpenObligationsForMember(memberId);
  }

  return (
    <div className="lt-canvas min-h-screen">
      <header className="border-b border-[var(--lt-line)] bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[15px] font-semibold text-[var(--lt-ink)]">
              Living Testimonies
            </p>
            <p className="text-[11px] text-[var(--lt-muted)]">
              Online giving · Head Office ledger
            </p>
          </div>
          <Link href={session ? "/portal" : "/login"} className="text-sm text-[var(--lt-accent)]">
            {session ? "My portal" : "Sign in"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-5 px-6 py-8">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--lt-ink)]">
            Give online
          </h1>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Tithes, thanksgiving, and special projects post only to Head Office
            contributions — never to a branch cashbook. Pastoral Board reports
            stay aggregates only.
          </p>
        </div>

        <GiveForm
          providers={providers}
          defaultMemberNumber={memberNumber}
          obligations={obligations}
        />

        <p className="text-xs text-[var(--lt-muted)]">
          Demo / sandbox mode runs when Paystack or MoMo keys are missing. Your
          gift still posts to the HQ obligation ledger.
        </p>
      </main>
    </div>
  );
}
