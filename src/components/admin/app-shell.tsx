import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  userName?: string | null;
};

const nav = [
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
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="text-sm font-semibold tracking-tight text-slate-800">
              LTJBM CDMS
            </Link>
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sky-900 hover:underline"
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/members" className="text-slate-500 hover:underline">
                Members
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              {userName}
              {" · Admin / Data Centre"}
            </span>
            <SignOutButton />
          </div>
        </div>
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
