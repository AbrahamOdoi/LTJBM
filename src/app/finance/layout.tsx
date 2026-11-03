import { auth } from "@/auth";
import Link from "next/link";
import { canWriteFinance } from "@/lib/roles";

const nav = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/obligations", label: "Obligations" },
  { href: "/finance/batches", label: "Saturday batches" },
  { href: "/finance/arrears", label: "Dues arrears" },
];

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const canWrite = canWriteFinance(role);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              HQ finance
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              LTJBM CDMS Finance
            </h1>
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{role}</span>
            {" · "}
            {canWrite ? "read/write" : "read-only"}
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/"
            className="ml-auto rounded-md px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50"
          >
            Home
          </Link>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
