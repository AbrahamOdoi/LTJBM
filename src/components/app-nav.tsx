import Link from "next/link";
import { roleNavItems, type NavSurface } from "@/lib/role-labels";

type Props = {
  role?: string | null;
  active?: NavSurface;
  tone?: "primary" | "muted";
};

export function AppNav({ role, active }: Props) {
  const items = roleNavItems(role).filter((item) => item.surface !== "home");

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Primary">
      {items.map((item) => {
        const isActive = active === item.surface;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "rounded-md bg-[var(--lt-accent-soft)] px-2.5 py-1.5 font-medium text-[var(--lt-accent)]"
                : "rounded-md px-2.5 py-1.5 text-[var(--lt-ink-soft)] hover:bg-[#eef0f3] hover:text-[var(--lt-ink)]"
            }
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
