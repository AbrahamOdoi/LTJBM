import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { canWriteMedia } from "@/lib/roles";

export default async function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const writeOk = canWriteMedia(session?.user?.role);

  const subNav = [
    { href: "/media", label: "All sermons" },
    ...(writeOk ? [{ href: "/media/new", label: "Add sermon" }] : []),
  ];

  return (
    <AppShell
      title="Sermon library"
      subtitle="Messages, series, and media links for staff — members may browse published sermons in the portal."
      role={session?.user?.role}
      userName={session?.user?.name}
      active="media"
      subNav={subNav}
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
