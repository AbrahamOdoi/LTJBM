import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { canWriteEvents } from "@/lib/roles";

export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const writeOk = canWriteEvents(session?.user?.role);

  const subNav = [
    { href: "/events", label: "Calendar" },
    { href: "/events/rooms", label: "Rooms" },
    ...(writeOk ? [{ href: "/events/new", label: "Add event" }] : []),
  ];

  return (
    <AppShell
      title="Events"
      subtitle="Church calendar and facility room bookings."
      role={session?.user?.role}
      userName={session?.user?.name}
      active="events"
      subNav={subNav}
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
