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
            ? "rounded-md px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            : "rounded-md px-2.5 py-1.5 text-sky-950 hover:bg-sky-50";
        const activeClass = isActive
          ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
          : base;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={activeClass}
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
