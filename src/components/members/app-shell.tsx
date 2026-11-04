import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import {
  canAccessAdmin,
  canAccessFinance,
  canWriteMembers,
} from "@/lib/roles";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  role?: string | null;
  userName?: string | null;
};

export function MembersAppShell({
  children,
  title,
  subtitle,
  role,
  userName,
}: Props) {
  const writeOk = canWriteMembers(role);
  const financeOk = canAccessFinance(role);
  const adminOk = canAccessAdmin(role);

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#f4f7fb_0%,#e8eef6_45%,#dfe8f2_100%)] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold tracking-tight text-slate-800">
              LTJBM CDMS
            </Link>
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              <Link href="/members" className="text-sky-900 hover:underline">
                Members
              </Link>
              {writeOk ? (
                <Link href="/members/new" className="text-sky-900 hover:underline">
                  Register
                </Link>
              ) : null}
              <Link
                href="/members/duplicates"
                className="text-sky-900 hover:underline"
              >
                Duplicates
              </Link>
              <Link
                href="/members/print"
                className="text-sky-900 hover:underline"
              >
                Print list
              </Link>
              {financeOk ? (
                <Link href="/finance" className="text-slate-500 hover:underline">
                  Finance
                </Link>
              ) : null}
              {adminOk ? (
                <Link href="/admin" className="text-slate-500 hover:underline">
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              {userName}
              {role ? ` · ${role}` : ""}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="print:hidden">
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
