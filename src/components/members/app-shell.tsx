import { AppShell } from "@/components/app-shell";
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

  const subNav = [
    { href: "/members", label: "Member register" },
    ...(writeOk
      ? [{ href: "/members/new", label: "Register member" }]
      : []),
    { href: "/members/duplicates", label: "Possible duplicates" },
    { href: "/members/print", label: "Print list" },
  ];

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      role={role}
      userName={userName}
      active="members"
      subNav={subNav}
      banner="Members — membership records only; Head Office handles contributions"
    >
      {children}
    </AppShell>
  );
}
