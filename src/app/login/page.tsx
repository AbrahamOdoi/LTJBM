import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_#0f172a_55%,_#020617_100%)] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <p className="text-sm tracking-[0.2em] uppercase text-sky-300/80 mb-3">
          LTJBM
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Church Database Management System
        </h1>
        <p className="text-slate-300 mb-8 text-sm leading-relaxed">
          Sign in with your assigned role. Finance screens are HQ-only and
          blocked for Records Clerks.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
