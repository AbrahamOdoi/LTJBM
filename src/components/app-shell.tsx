import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { roleLabel, type NavSurface } from "@/lib/role-labels";

export type SubNavItem = {
  href: string;
  label: string;
};

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  role?: string | null;
  userName?: string | null;
  active: NavSurface;
  subNav?: SubNavItem[];
  banner?: string;
  /** Hide page header block (rare — content provides its own) */
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
  banner,
  hidePageHeader,
}: Props) {
  return (
    <div className="lt-canvas">
      <header className="border-b border-[var(--lt-line)] bg-[color-mix(in_srgb,var(--lt-paper-elevated)_92%,transparent)] backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="group lt-brand-in block leading-tight">
              <span className="font-display text-lg font-semibold tracking-tight text-[var(--lt-ink)] group-hover:text-[var(--lt-ink-soft)]">
                Living Testimonies
              </span>
              <span className="mt-0.5 block text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[var(--lt-brass)]">
                LTJBM · Church Database
              </span>
            </Link>
            <AppNav role={role} active={active} />
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--lt-muted)]">
            <span className="hidden sm:inline">
              {(() => {
                const roleText = role ? roleLabel(role) : null;
                const showName =
                  userName &&
                  roleText &&
                  userName.trim().toLowerCase() !== roleText.trim().toLowerCase()
                    ? userName
                    : userName && !roleText
                      ? userName
                      : null;
                if (showName && roleText) {
                  return (
                    <>
                      <span className="font-medium text-[var(--lt-ink)]">
                        {showName}
                      </span>
                      {" · "}
                      {roleText}
                    </>
                  );
                }
                if (roleText) {
                  return (
                    <span className="font-medium text-[var(--lt-ink)]">
                      {roleText}
                    </span>
                  );
                }
                return showName;
              })()}
            </span>
            <SignOutButton />
          </div>
        </div>
        {banner ? (
          <div className="mx-auto max-w-6xl px-6 pb-1">
            <p className="text-xs text-[var(--lt-muted)]">{banner}</p>
          </div>
        ) : null}
        {subNav && subNav.length > 0 ? (
          <nav
            className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3"
            aria-label="Section"
          >
            {subNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--lt-ink-soft)] transition-colors hover:bg-white/80"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="lt-enter mx-auto max-w-6xl space-y-6 px-6 py-8">
        {!hidePageHeader ? (
          <div className="print:hidden">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--lt-ink)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--lt-muted)]">
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
