import { auth } from "@/auth";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { accessModeLabel, roleLabel } from "@/lib/role-labels";

const subNav = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/obligations", label: "Obligations" },
  { href: "/finance/batches", label: "Saturday batches" },
  { href: "/finance/arrears", label: "Dues arrears" },
];

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="text-sm font-semibold tracking-tight text-slate-800">
              LTJBM CDMS
            </Link>
            <AppNav role={role} active="finance" />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              <span className="font-medium text-slate-900">{roleLabel(role)}</span>
              {" · "}
              {accessModeLabel(role, "finance")}
            </span>
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-1">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            HQ finance — branches do not enter money here
          </p>
        </div>
        <nav
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3"
          aria-label="Finance sections"
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
