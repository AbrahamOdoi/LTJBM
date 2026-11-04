import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAppShell } from "@/components/admin/app-shell";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminCompliancePage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  return (
    <AdminAppShell
      title="Data protection (Ghana)"
      subtitle="Thin operational summary — not legal advice. Aligns LTJBM CDMS practice with Ghana Data Protection Act 2012 (Act 843) expectations for church membership records and photos."
      userName={session.user.name}
    >
      <article className="lt-panel prose-sm max-w-3xl space-y-5 p-6 text-sm leading-relaxed text-[var(--lt-ink-soft)]">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--lt-ink)]">
            What we hold
          </h2>
          <p>
            Membership biodata (name, contact, household, sacraments, photos),
            attendance, pastoral notes (restricted), and Head Office contribution
            records. Photos are stored as gated uploads under{" "}
            <code className="text-xs">/uploads</code>, not on a public CDN.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--lt-ink)]">
            Lawful use &amp; access
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Staff access is role-gated (RBAC); Board sees giving aggregates only.</li>
            <li>Pastoral care notes are restricted to Pastoral Board, Branch Leaders, and Admin.</li>
            <li>Member portal users see only their own profile and own statement.</li>
            <li>Audit log records who changed what (see{" "}
              <Link href="/admin/audit" className="lt-link">
                Audit log
              </Link>
              ).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--lt-ink)]">
            Photo retention (recommended practice)
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Keep member photos only while the person is an Active / Visitor
              record or while pastoral follow-up requires identification.
            </li>
            <li>
              On Transfer / Deceased / long Inactive, remove or archive photos
              after a documented retention window (default recommendation:{" "}
              <strong className="font-medium text-[var(--lt-ink)]">24 months</strong>{" "}
              unless a live pastoral or legal need remains).
            </li>
            <li>
              Export and backup snapshots inherit the same sensitivity — store
              encrypted and limit who can restore.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--lt-ink)]">
            Member rights (operational)
          </h2>
          <p>
            Requests to view, correct, or erase personal data should go through
            Data Centre. Erasure of contribution history may be limited where
            financial accountability or statutory retention applies; document any
            refusal with reason.
          </p>
        </section>

        <p className="text-xs text-[var(--lt-muted)]">
          This page is a short compliance aid for operators. Engage counsel for
          formal DPIA / registration with the Data Protection Commission as
          needed.
        </p>
      </article>
    </AdminAppShell>
  );
}
