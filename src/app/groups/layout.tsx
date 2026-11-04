import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { canWriteGroups } from "@/lib/roles";

export default async function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const writeOk = canWriteGroups(session?.user?.role);

  const subNav = [
    { href: "/groups", label: "All groups" },
    ...(writeOk ? [{ href: "/groups/new", label: "New group" }] : []),
  ];

  return (
    <AppShell
      title="Groups & ministries"
      subtitle="Departments, cells, choirs, ushers — rosters, leaders, meetings, and stub announcements."
      role={session?.user?.role}
      userName={session?.user?.name}
      active="groups"
      subNav={subNav}
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
