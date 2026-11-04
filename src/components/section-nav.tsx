"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionNavItem = {
  href: string;
  label: string;
};

/** Underline tab strip — Planning Center–style section nav. */
export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="mx-auto flex max-w-6xl gap-0 overflow-x-auto border-t border-[var(--lt-line)] px-4"
      aria-label="Section"
    >
      {items.map((item) => {
        // Shallow roots match exactly; deeper paths match prefix
        const isRoot = ["/finance", "/members", "/reports", "/admin"].includes(
          item.href,
        );
        const isActive = isRoot
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "border-b-2 border-[var(--lt-accent)] px-3 py-2.5 text-sm font-medium text-[var(--lt-ink)]"
                : "border-b-2 border-transparent px-3 py-2.5 text-sm text-[var(--lt-muted)] hover:text-[var(--lt-ink)]"
            }
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
