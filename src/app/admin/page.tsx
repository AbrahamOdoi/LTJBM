import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { SceneBanner } from "@/components/scene-banner";
import { adminConsoleStats } from "@/lib/admin/queries";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const stats = await adminConsoleStats();

  return (
    <AdminAppShell
      title="Data Centre"
      subtitle="Configure data-entry domains and subdomains (dropdown lists), manage users and roles, export member records, and walk through backup & restore."
      userName={session.user.name}
    >
      <SceneBanner
        scene="workspace"
        density="strip"
        caption="Church house — Data Centre domains, users, export, and backup"
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Users", value: stats.userCount },
          { label: "Active users", value: stats.activeUsers },
          { label: "Domains (dropdown lists)", value: stats.domainCount },
          { label: "Members", value: stats.memberCount },
        ].map((card) => (
          <div key={card.label} className="lt-panel lt-card-appear px-4 py-5">
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-[var(--lt-muted)]">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--lt-ink)]">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          {
            href: "/admin/domains",
            title: "Domains & subdomains",
            body: "Data-entry dropdown lists and parent values used on the member register (brief: domains / sub domains).",
          },
          {
            href: "/admin/custom-fields",
            title: "Custom fields",
            body: "Freeform per-member fields beyond fixed domain dropdowns.",
          },
          {
            href: "/admin/users",
            title: "Users & roles",
            body: "Create and update Data Centre accounts, ministry roles, and branch scopes.",
          },
          {
            href: "/admin/audit",
            title: "Audit log",
            body: "Browse who changed members, finance, attendance, and admin settings.",
          },
          {
            href: "/admin/compliance",
            title: "Data protection",
            body: "Short Ghana DPA / photo retention guidance for operators.",
          },
          {
            href: "/admin/export",
            title: "Member data export",
            body: "Download member records as CSV or JSON for portability demos.",
          },
          {
            href: "/admin/migrate",
            title: "Register migration",
            body: "Import members from a spreadsheet — column mapping, dry-run, commit.",
          },
          {
            href: "/admin/backup",
            title: "Backup & restore",
            body: "Automated schedule guidance, logical snapshot, and Postgres restore.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="lt-panel lt-card-appear block p-5 transition hover:border-[var(--lt-accent)]"
          >
            <h2 className="text-base font-medium text-[var(--lt-ink)]">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--lt-muted)]">{item.body}</p>
          </Link>
        ))}
      </section>
    </AdminAppShell>
  );
}
