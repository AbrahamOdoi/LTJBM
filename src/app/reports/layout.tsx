import { auth } from "@/auth";
import Link from "next/link";
import { canEditReportTemplates } from "@/lib/roles";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = canEditReportTemplates(role);

  const nav = [
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
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Board / Council reporting
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              LTJBM CDMS Reports
            </h1>
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{role}</span>
            {" · "}
            {canEdit ? "template edit" : "aggregates read-only"}
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/"
            className="ml-auto rounded-md px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50"
          >
            Home
          </Link>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
