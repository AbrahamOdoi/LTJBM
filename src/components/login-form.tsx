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
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
      >
        <label className="block text-sm">
          <span className="text-slate-300">Email</span>
          <input
            ref={emailRef}
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-sky-400"
            placeholder="clerk@ltjbm.local"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-300">Password</span>
          <input
            ref={passwordRef}
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-sky-400"
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
          className="w-full rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-slate-100">Demo roles</h2>
          <p className="text-xs text-slate-400">
            Password: <code className="text-sky-200">{DEMO_PASSWORD_HINT}</code>
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
          Tap a role to fill the form, then sign in. Useful for Section 8 access
          walkthroughs.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => {
            const active = selectedDemo === account.email;
            return (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(account)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    active
                      ? "border-sky-400/70 bg-sky-500/15"
                      : "border-white/10 bg-slate-950/40 hover:border-white/25"
                  }`}
                >
                  <span className="block text-sm font-medium text-slate-100">
                    {account.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
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
