import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { accessModeLabel } from "@/lib/role-labels";

const subNav = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/obligations", label: "Pledges & obligations" },
  { href: "/finance/batches", label: "Saturday collection batches" },
  { href: "/finance/arrears", label: "Dues arrears" },
];

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <AppShell
      title="Contributions"
      subtitle={`${accessModeLabel(role, "finance")}. Head Office finance — branches handle membership only.`}
      role={role}
      userName={session?.user?.name}
      active="finance"
      subNav={subNav}
      banner="Head Office contributions — Pledge, Tithe, Dues, Thanksgiving, Special Project"
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
