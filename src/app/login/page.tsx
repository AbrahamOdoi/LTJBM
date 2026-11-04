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
    <main className="lt-login-canvas flex items-center justify-center p-6">
      <div className="lt-enter w-full max-w-lg">
        <div className="lt-brand-in mb-8">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-[var(--lt-brass)]">
            Living Testimonies for Jesus Bible Ministry
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#f2f7f4]">
            LTJBM
          </h1>
          <p className="mt-1 font-display text-xl text-[#c5d9cf]">
            Church membership &amp; contributions
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#a8c0b4]">
            Sign in to care for members, record Head Office contributions, or
            review Board reports — according to your ministry role.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
