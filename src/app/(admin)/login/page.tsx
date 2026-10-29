"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("error") === "no-access" ? "This account has no dashboard access." : "");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await createBrowserSupabase().auth.signInWithPassword({
      email: String(f.get("email")).trim(),
      password: String(f.get("password")),
    });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      setBusy(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-brand-500";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="h-11 w-full rounded-lg bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-card">
        <Image src="/brand/logo-full.png" alt="Sharjah Drug Store" width={1084} height={592} priority className="mx-auto mb-6 h-auto w-48" />
        <h1 className="mb-1 text-xl font-extrabold">Dashboard sign in</h1>
        <p className="mb-6 text-sm text-muted">For warehouse staff and partner companies.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <Link href="/en" className="mt-6 block text-center text-sm text-muted hover:text-brand-700">← Back to website</Link>
      </div>
    </main>
  );
}
