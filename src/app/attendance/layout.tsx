import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";

const subNav = [
  { href: "/attendance", label: "Sessions" },
  { href: "/attendance/new", label: "New session" },
  { href: "/attendance/kids", label: "Children’s check-in" },
  { href: "/attendance/trends", label: "Trends & alerts" },
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
      subtitle="Service, cell, and children’s check-in — manual, kiosk, mobile QR, and pickup tags."
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
