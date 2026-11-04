import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SectionNav, type SectionNavItem } from "@/components/section-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { roleLabel, type NavSurface } from "@/lib/role-labels";

export type SubNavItem = SectionNavItem;

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  role?: string | null;
  userName?: string | null;
  active: NavSurface;
  subNav?: SubNavItem[];
  hidePageHeader?: boolean;
};

export function AppShell({
  children,
  title,
  subtitle,
  role,
  userName,
  active,
  subNav,
  hidePageHeader,
}: Props) {
  const roleText = role ? roleLabel(role) : null;
  const showName =
    userName &&
    roleText &&
    userName.trim().toLowerCase() !== roleText.trim().toLowerCase()
      ? userName
      : userName && !roleText
        ? userName
        : null;

  return (
    <div className="lt-canvas">
      <header className="border-b border-[var(--lt-line)] bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex flex-wrap items-center gap-8">
            <Link href="/" className="leading-tight">
              <span className="text-[15px] font-semibold tracking-tight text-[var(--lt-ink)]">
                Living Testimonies
              </span>
              <span className="mt-0.5 block text-[11px] font-medium text-[var(--lt-muted)]">
                LTJBM Church Database
              </span>
            </Link>
            <AppNav role={role} active={active} />
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--lt-muted)]">
            <span className="hidden sm:inline">
              {showName && roleText ? (
                <>
                  <span className="font-medium text-[var(--lt-ink)]">
                    {showName}
                  </span>
                  {" · "}
                  {roleText}
                </>
              ) : roleText ? (
                <span className="font-medium text-[var(--lt-ink)]">{roleText}</span>
              ) : (
                showName
              )}
            </span>
            <SignOutButton />
          </div>
        </div>
        {subNav && subNav.length > 0 ? <SectionNav items={subNav} /> : null}
      </header>

      <main className="lt-enter mx-auto max-w-6xl space-y-5 px-6 py-6">
        {!hidePageHeader ? (
          <div className="print:hidden">
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--lt-ink)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
