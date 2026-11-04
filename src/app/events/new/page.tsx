import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/events/create-event-form";
import { requireEventsWrite } from "@/lib/auth-guards";
import { listBranchesForUser } from "@/lib/members/queries";

export default async function NewEventPage() {
  const session = await requireEventsWrite().catch(() => null);
  if (!session) redirect("/login");

  const branches = await listBranchesForUser(session.user);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Add church event
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Calendar entry with optional light registration.
        </p>
      </div>
      <CreateEventForm
        branches={branches.map((b) => ({
          id: b.id,
          label: `${b.name} (${b.code})`,
        }))}
      />
    </div>
  );
}
