import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { requireGroupsWrite } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function NewGroupPage() {
  const session = await requireGroupsWrite().catch(() => null);
  if (!session) redirect("/groups");

  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <Link href="/groups" className="lt-link text-sm">
          ← All groups
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          New group
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Add a department, choir, usher team, cell, or fellowship. No finance
          posting from this surface.
        </p>
      </div>
      <CreateGroupForm
        branches={branches.map((b) => ({
          id: b.id,
          label: `${b.name} (${b.code})`,
        }))}
      />
    </div>
  );
}
