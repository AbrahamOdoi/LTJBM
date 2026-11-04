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
    { href: "/members", label: "Register" },
    ...(writeOk ? [{ href: "/members/new", label: "Add member" }] : []),
    { href: "/members/follow-ups", label: "Visitor follow-ups" },
    { href: "/members/milestones", label: "Milestones" },
    { href: "/members/duplicates", label: "Duplicates" },
    { href: "/members/print", label: "Print" },
  ];

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      role={role}
      userName={userName}
      active="members"
      subNav={subNav}
    >
      {children}
    </AppShell>
  );
}
