import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { Role } from "@/lib/roles";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  userName?: string | null;
};

const subNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/domains", label: "Domains" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/export", label: "Export" },
  { href: "/admin/backup", label: "Backup" },
];

export function AdminAppShell({ children, title, subtitle, userName }: Props) {
  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#f7f5f1_0%,#eef2f7_50%,#e4ebf3_100%)] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="text-sm font-semibold tracking-tight text-slate-800">
              LTJBM CDMS
            </Link>
            <AppNav role={Role.Admin} active="admin" />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              {userName}
              {" · Admin / Data Centre"}
            </span>
            <SignOutButton />
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 pb-3"
          aria-label="Admin sections"
        >
          {subNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-white/80"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
