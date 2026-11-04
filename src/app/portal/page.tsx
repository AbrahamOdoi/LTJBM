import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PortalProfileForm } from "@/components/portal/profile-form";
import { requirePortalAccess } from "@/lib/auth-guards";
import { getPortalProfile } from "@/lib/portal/service";

export default async function PortalHomePage() {
  const session = await requirePortalAccess().catch(() => null);
  if (!session) redirect("/login");

  const memberId = session.user.memberId!;
  const member = await getPortalProfile(memberId);
  if (!member) redirect("/login");

  const cell = member.groups.find((g) => g.kind === "Cell");
  const fellowship = member.groups.find((g) => g.kind === "Fellowship");

  return (
    <AppShell
      title="My portal"
      subtitle="Your profile and your own contribution statement — never another member's giving."
      role={session.user.role}
      userName={session.user.name}
      active="portal"
      subNav={[
        { href: "/portal", label: "My profile" },
        { href: "/portal/statement", label: "My statement" },
        { href: "/portal/sermons", label: "Sermons" },
        { href: "/give", label: "Give online" },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="lt-panel space-y-3 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Membership
          </h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--lt-muted)]">Name</dt>
              <dd className="font-medium">
                {member.firstName} {member.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--lt-muted)]">Number</dt>
              <dd className="font-medium">{member.memberNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--lt-muted)]">Branch</dt>
              <dd className="font-medium">{member.branch.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--lt-muted)]">Status</dt>
              <dd className="font-medium">{member.status}</dd>
            </div>
            <div>
              <dt className="text-[var(--lt-muted)]">Cell</dt>
              <dd>{cell?.cell?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--lt-muted)]">Fellowship</dt>
              <dd>{fellowship?.fellowshipMinistry?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--lt-muted)]">Joined</dt>
              <dd>
                {member.joinedAt
                  ? member.joinedAt.toISOString().slice(0, 10)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--lt-muted)]">Baptism</dt>
              <dd>
                {member.baptismDate
                  ? member.baptismDate.toISOString().slice(0, 10)
                  : "—"}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link href="/portal/statement" className="lt-btn-primary inline-flex">
              View my contribution statement
            </Link>
            <Link href="/portal/sermons" className="lt-btn-secondary inline-flex">
              Browse sermons
            </Link>
          </div>
        </section>

        <PortalProfileForm
          initial={{
            phone: member.phone,
            email: member.email,
            addressLine1: member.addressLine1,
            addressLine2: member.addressLine2,
            city: member.city,
            region: member.region,
          }}
        />
      </div>
    </AppShell>
  );
}
