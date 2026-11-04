import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateTeamForm } from "@/components/volunteers/create-team-form";
import { requireVolunteersWrite } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function NewVolunteerTeamPage() {
  const session = await requireVolunteersWrite().catch(() => null);
  if (!session) redirect("/login");

  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/volunteers/teams" className="lt-link">
            Teams
          </Link>{" "}
          / new
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          New volunteer team
        </h2>
      </div>
      <CreateTeamForm branches={branches} />
    </div>
  );
}
