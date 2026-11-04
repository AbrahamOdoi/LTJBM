import { AppShell } from "@/components/app-shell";
import { Role } from "@/lib/roles";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  userName?: string | null;
};

const subNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/domains", label: "Domains & dropdowns" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/communications", label: "Communications" },
  { href: "/admin/export", label: "Export" },
  { href: "/admin/backup", label: "Backup" },
];

export function AdminAppShell({ children, title, subtitle, userName }: Props) {
  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      role={Role.Admin}
      userName={userName}
      active="admin"
      subNav={subNav}
    >
      {children}
    </AppShell>
  );
}
