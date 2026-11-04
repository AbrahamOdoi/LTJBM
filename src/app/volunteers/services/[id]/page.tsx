import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddNeedForm } from "@/components/volunteers/add-need-form";
import { AssignVolunteerForm } from "@/components/volunteers/assign-form";
import { requireVolunteersAccess } from "@/lib/auth-guards";
import { volunteerTeamKindLabel } from "@/lib/church-labels";
import { canWriteVolunteers } from "@/lib/roles";
import { setAssignmentStatusAction } from "@/lib/volunteers/actions";
import {
  getVolunteerService,
  listRolesForPicker,
} from "@/lib/volunteers/service";

type Params = Promise<{ id: string }>;

export default async function VolunteerServiceDetailPage({
  params,
}: {
  params: Params;
}) {
  const session = await requireVolunteersAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const [service, roles] = await Promise.all([
    getVolunteerService(id),
    listRolesForPicker(),
  ]);
  if (!service) notFound();
  const writeOk = canWriteVolunteers(session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/volunteers/services" className="lt-link">
            Service schedules
          </Link>{" "}
          / {service.label}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          {service.label}
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          {service.startsAt.toISOString().slice(0, 16).replace("T", " ")}
          {service.endsAt
            ? ` – ${service.endsAt.toISOString().slice(11, 16)}`
            : ""}
          {service.branch ? ` · ${service.branch.name}` : ""}
          {service.location ? ` · ${service.location}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          {service.needs.length === 0 ? (
            <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
              No role needs yet. Add usher doors, worship vocals, hospitality
              hosts, and so on.
            </p>
          ) : (
            service.needs.map((need) => {
              const active = need.assignments.filter(
                (a) => a.status === "SignedUp" || a.status === "Confirmed",
              );
              return (
                <section key={need.id} className="lt-panel space-y-4 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-[var(--lt-ink)]">
                        {need.role.team.name} · {need.role.name}
                      </h3>
                      <p className="text-sm text-[var(--lt-muted)]">
                        {volunteerTeamKindLabel(need.role.team.kind)} ·{" "}
                        {active.length}/{need.slotsNeeded} filled
                      </p>
                    </div>
                  </div>

                  {need.assignments.length === 0 ? (
                    <p className="text-sm text-[var(--lt-muted)]">
                      No volunteers assigned yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 text-sm">
                      {need.assignments.map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2"
                        >
                          <span>
                            {a.member.firstName} {a.member.lastName}
                            <span className="text-[var(--lt-muted)]">
                              {" "}
                              · {a.status}
                              {a.notes ? ` · ${a.notes}` : ""}
                            </span>
                          </span>
                          {writeOk && a.status !== "Cancelled" ? (
                            <form action={setAssignmentStatusAction}>
                              <input
                                type="hidden"
                                name="assignmentId"
                                value={a.id}
                              />
                              <input
                                type="hidden"
                                name="serviceId"
                                value={service.id}
                              />
                              <input
                                type="hidden"
                                name="status"
                                value="Cancelled"
                              />
                              <button
                                type="submit"
                                className="text-xs text-[var(--lt-danger)] hover:underline"
                              >
                                Remove
                              </button>
                            </form>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}

                  {writeOk && active.length < need.slotsNeeded ? (
                    <AssignVolunteerForm
                      needId={need.id}
                      serviceId={service.id}
                      branchId={service.branchId}
                      roleLabel={`${need.role.team.name} · ${need.role.name}`}
                    />
                  ) : null}
                </section>
              );
            })
          )}
        </div>

        {writeOk ? (
          <AddNeedForm
            serviceId={service.id}
            roles={roles.map((r) => ({
              id: r.id,
              name: r.name,
              defaultSlots: r.defaultSlots,
              team: r.team,
            }))}
          />
        ) : null}
      </div>
    </div>
  );
}
