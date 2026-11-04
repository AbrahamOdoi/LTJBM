import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateServiceForm } from "@/components/volunteers/create-service-form";
import { requireVolunteersWrite } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function NewVolunteerServicePage() {
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
          <Link href="/volunteers/services" className="lt-link">
            Service schedules
          </Link>{" "}
          / new
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Schedule a service
        </h2>
      </div>
      <CreateServiceForm branches={branches} />
    </div>
  );
}
