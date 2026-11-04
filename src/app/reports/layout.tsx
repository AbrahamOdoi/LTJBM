import { auth } from "@/auth";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { accessModeLabel, roleLabel } from "@/lib/role-labels";
import { canEditReportTemplates } from "@/lib/roles";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = canEditReportTemplates(role);

  const subNav = [
    { href: "/reports", label: "Dashboard" },
    ...(canEdit
      ? [
          { href: "/reports/templates", label: "Templates" },
          { href: "/reports/schedules", label: "Schedules" },
        ]
      : [{ href: "/reports/schedules", label: "Schedules" }]),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="text-sm font-semibold tracking-tight text-slate-800">
              LTJBM CDMS
            </Link>
            <AppNav role={role} active="reports" />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              <span className="font-medium text-slate-900">{roleLabel(role)}</span>
              {" · "}
              {accessModeLabel(role, "reports")}
            </span>
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-1">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Board / Council reporting — aggregated Expected · Paid · Outstanding
          </p>
        </div>
        <nav
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3"
          aria-label="Reports sections"
        >
          {subNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
