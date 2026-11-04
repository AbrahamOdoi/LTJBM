import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { accessModeLabel } from "@/lib/role-labels";

const subNav = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/obligations", label: "Pledges & obligations" },
  { href: "/finance/campaigns", label: "Special projects" },
  { href: "/finance/online-giving", label: "Online giving" },
  { href: "/finance/statements", label: "Statements" },
  { href: "/finance/batches", label: "Saturday collections" },
  { href: "/finance/arrears", label: "Dues arrears" },
  { href: "/finance/ledger", label: "Ledger (GL)" },
  { href: "/finance/budgets", label: "Budgets" },
  { href: "/finance/expenses", label: "Expenses" },
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
      subtitle={`${accessModeLabel(role, "finance")}. Head Office only — branches handle membership.`}
      role={role}
      userName={session?.user?.name}
      active="finance"
      subNav={subNav}
      hidePageHeader
    >
      {children}
    </AppShell>
  );
}
