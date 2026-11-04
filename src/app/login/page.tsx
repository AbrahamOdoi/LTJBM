import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { SceneBanner } from "@/components/scene-banner";
import { defaultPathForRole } from "@/lib/role-labels";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(defaultPathForRole(session.user.role));
  }

  return (
    <main className="lt-login-canvas flex min-h-screen items-center justify-center p-6">
      <div className="lt-enter grid w-full max-w-4xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="hidden flex-col justify-between lg:flex">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--lt-muted)]">
              Living Testimonies for Jesus Bible Ministry
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
              Church membership &amp; contributions
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lt-muted)]">
              Sign in to care for members, record Head Office contributions, or
              review Board reports — according to your ministry role.
            </p>
          </div>
          <SceneBanner
            scene="login"
            density="hero"
            caption="Sanctuary photography · see README image attribution"
          />
        </div>

        <div className="w-full max-w-md justify-self-center lg:max-w-none lg:justify-self-stretch">
          <div className="mb-6 text-center lg:hidden">
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
          <div className="mb-4 overflow-hidden rounded-lg border border-[var(--lt-line)] lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/scenes/login.jpg"
              alt="Sunlit church sanctuary pews"
              className="h-36 w-full object-cover"
            />
          </div>
          <p className="mb-3 hidden text-sm font-medium text-[var(--lt-ink)] lg:block">
            Sign in to LTJBM
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
