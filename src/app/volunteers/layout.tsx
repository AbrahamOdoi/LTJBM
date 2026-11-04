import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { canWriteVolunteers } from "@/lib/roles";

export default async function VolunteersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const writeOk = canWriteVolunteers(session?.user?.role);

  const subNav = [
    { href: "/volunteers", label: "Overview" },
    { href: "/volunteers/teams", label: "Teams & roles" },
    { href: "/volunteers/services", label: "Service schedules" },
    ...(writeOk
      ? [
          { href: "/volunteers/teams/new", label: "New team" },
          { href: "/volunteers/services/new", label: "New service" },
        ]
      : []),
  ];

  return (
    <AppShell
      title="Volunteers"
      subtitle="Ushers, worship, hospitality, and other ministry teams — signup and service schedules."
      role={session?.user?.role}
      userName={session?.user?.name}
      active="volunteers"
      subNav={subNav}
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
