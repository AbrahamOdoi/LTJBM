import Link from "next/link";
import { roleNavItems, type NavSurface } from "@/lib/role-labels";

type Props = {
  role?: string | null;
  active?: NavSurface;
  /** Softer style for secondary/cross-links in dense headers */
  tone?: "primary" | "muted";
};

export function AppNav({ role, active, tone = "primary" }: Props) {
  const items = roleNavItems(role).filter((item) => item.surface !== "home");

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Primary">
      {items.map((item) => {
        const isActive = active === item.surface;
        const base =
          tone === "muted"
            ? "rounded-md px-2.5 py-1.5 text-[var(--lt-muted)] hover:bg-white/70 hover:text-[var(--lt-ink)]"
            : "rounded-md px-2.5 py-1.5 text-[var(--lt-ink-soft)] hover:bg-white/80";
        const activeClass = isActive
          ? "bg-[var(--lt-ink)] text-white hover:bg-[var(--lt-ink-soft)] hover:text-white"
          : base;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`transition-colors duration-150 ${activeClass}`}
            aria-current={isActive ? "page" : undefined}
            title={item.description}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
