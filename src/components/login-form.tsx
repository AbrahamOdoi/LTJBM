"use client";

import { FormEvent, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD_HINT,
  type DemoAccount,
} from "@/lib/demo-accounts";
import { defaultPathForRole } from "@/lib/role-labels";

export function LoginForm() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  function fillDemo(account: DemoAccount) {
    setSelectedDemo(account.email);
    setError(null);
    if (emailRef.current) emailRef.current.value = account.email;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD_HINT;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    const demo = DEMO_ACCOUNTS.find((a) => a.email === email);
    router.push(demo ? defaultPathForRole(demo.role) : "/");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm"
      >
        <label className="block text-sm">
          <span className="text-[#b8d0c4]">Email</span>
          <input
            ref={emailRef}
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1.5 w-full rounded-md border border-white/15 bg-[#0b1f1a]/70 px-3 py-2.5 text-[#eef5f1] outline-none transition focus:border-[var(--lt-accent-bright)] focus:shadow-[0_0_0_3px_rgba(61,143,120,0.35)]"
            placeholder="clerk@ltjbm.local"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[#b8d0c4]">Password</span>
          <input
            ref={passwordRef}
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-md border border-white/15 bg-[#0b1f1a]/70 px-3 py-2.5 text-[#eef5f1] outline-none transition focus:border-[var(--lt-accent-bright)] focus:shadow-[0_0_0_3px_rgba(61,143,120,0.35)]"
          />
        </label>
        {error ? (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-[var(--lt-accent-bright)] px-3 py-2.5 text-sm font-medium text-[#0b1f1a] transition hover:bg-[#4aa58c] disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-[#e8f0ec]">Demo ministry roles</h2>
          <p className="text-xs text-[#8fafa1]">
            Demo password:{" "}
            <span className="text-[#c9e0d4]">{DEMO_PASSWORD_HINT}</span>
          </p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#8fafa1]">
          Choose a role to fill the form, then sign in. For walkthroughs only —
          not for production hosts.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => {
            const active = selectedDemo === account.email;
            return (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(account)}
                  className={`w-full rounded-md border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-[var(--lt-accent-bright)]/70 bg-[var(--lt-accent)]/25"
                      : "border-white/10 bg-[#0b1f1a]/40 hover:border-white/25"
                  }`}
                >
                  <span className="block text-sm font-medium text-[#eef5f1]">
                    {account.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#8fafa1]">
                    {account.blurb}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
