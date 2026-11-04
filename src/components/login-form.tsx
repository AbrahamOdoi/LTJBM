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
    <div className="lt-panel overflow-hidden shadow-sm">
      <form onSubmit={onSubmit} className="space-y-4 p-6">
        <label className="block text-sm">
          <span className="font-medium text-[var(--lt-ink-soft)]">Email</span>
          <input
            ref={emailRef}
            name="email"
            type="email"
            required
            autoComplete="username"
            className="lt-input mt-1.5"
            placeholder="clerk@ltjbm.local"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[var(--lt-ink-soft)]">Password</span>
          <input
            ref={passwordRef}
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="lt-input mt-1.5"
          />
        </label>
        {error ? (
          <p className="text-sm text-[var(--lt-danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="lt-btn-primary w-full py-2.5">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="border-t border-[var(--lt-line)] bg-[#fafbfc] px-6 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-[var(--lt-ink)]">Demo roles</h2>
          <p className="text-xs text-[var(--lt-muted)]">
            Password {DEMO_PASSWORD_HINT}
          </p>
        </div>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => {
            const active = selectedDemo === account.email;
            return (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(account)}
                  className={`w-full rounded px-2.5 py-2 text-left text-sm transition ${
                    active
                      ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                      : "hover:bg-white"
                  }`}
                >
                  <span className="font-medium">{account.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--lt-muted)]">
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
