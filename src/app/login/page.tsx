import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { defaultPathForRole } from "@/lib/role-labels";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(defaultPathForRole(session.user.role));
  }

  return (
    <main className="lt-login-canvas flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--lt-muted)]">
            Living Testimonies for Jesus Bible Ministry
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Sign in to LTJBM
          </h1>
          <p className="mt-2 text-sm text-[var(--lt-muted)]">
            Church membership &amp; contributions
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
