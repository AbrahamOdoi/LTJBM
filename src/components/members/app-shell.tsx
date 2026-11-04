import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { roleLabel } from "@/lib/role-labels";
import { canWriteMembers } from "@/lib/roles";

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

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#f4f7fb_0%,#e8eef6_45%,#dfe8f2_100%)] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="text-sm font-semibold tracking-tight text-slate-800">
              LTJBM CDMS
            </Link>
            <AppNav role={role} active="members" />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              {userName}
              {role ? ` · ${roleLabel(role)}` : ""}
            </span>
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 pb-3 print:hidden">
          <SubLink href="/members" label="Register list" />
          {writeOk ? <SubLink href="/members/new" label="Register member" /> : null}
          <SubLink href="/members/duplicates" label="Duplicates" />
          <SubLink href="/members/print" label="Print list" />
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

function SubLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-white/80"
    >
      {label}
    </Link>
  );
}
