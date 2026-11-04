import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";

const subNav = [
  { href: "/attendance", label: "Sessions" },
  { href: "/attendance/new", label: "New session" },
];

export default async function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <AppShell
      title="Attendance"
      subtitle="Manual service and cell check-in (QR / kiosk later)."
      role={session?.user?.role}
      userName={session?.user?.name}
      active="attendance"
      subNav={subNav}
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
