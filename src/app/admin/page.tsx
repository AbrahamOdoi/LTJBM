import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
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
      title="Admin / Data Centre"
      subtitle="Domains, users, member export, and backup/restore narrative for the Section 8 demo. Day-to-day member and finance entry stay in their own workstreams."
      userName={session.user.name}
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Users", value: stats.userCount },
          { label: "Active users", value: stats.activeUsers },
          { label: "Domain lists", value: stats.domainCount },
          { label: "Members", value: stats.memberCount },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white/90 px-4 py-5"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          {
            href: "/admin/domains",
            title: "Domains & dropdowns",
            body: "Manage data-entry portal lists and subdomains (parent values).",
          },
          {
            href: "/admin/users",
            title: "Users & roles",
            body: "Create and update Admin / Data Centre accounts, roles, and branch scopes.",
          },
          {
            href: "/admin/export",
            title: "Member data export",
            body: "Download member biodata as CSV or JSON for portability demos.",
          },
          {
            href: "/admin/backup",
            title: "Backup & restore",
            body: "Logical snapshot download plus Postgres restore walkthrough.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl border border-slate-200 bg-white/90 p-5 hover:border-sky-300"
          >
            <h2 className="font-medium text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.body}</p>
          </Link>
        ))}
      </section>
    </AdminAppShell>
  );
}
