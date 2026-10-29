"use client";

import { useState } from "react";
import { BellRing, Gift, Mail, Sparkles } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";

export function Newsletter({ t }: { t: Dictionary["newsletter"] }) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setState("err");
    setState("busy");
    const { error } = await createBrowserSupabase().from("newsletter_subscribers").insert({ email });
    // A duplicate email means they're already subscribed — treat as success
    setState(!error || error.code === "23505" ? "ok" : "err");
  }

  const perkIcons = [Gift, Sparkles, BellRing];
  return (
    <section className="rounded-2xl bg-brand-800 px-5 py-6 text-white sm:px-8">
      <div className="grid items-center gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-10">
        <div className="flex items-center gap-4">
          <Mail className="size-10 shrink-0" strokeWidth={1.3} />
          <div>
            <p className="font-bold">{t.title}</p>
            <p className="text-sm text-white/75">{t.body}</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex h-12 w-full max-w-xl overflow-hidden rounded-xl bg-white" noValidate>
          <label htmlFor="nl-email" className="sr-only">{t.placeholder}</label>
          <input id="nl-email" name="email" type="email" required placeholder={t.placeholder} className="min-w-0 flex-1 px-4 text-sm text-ink outline-none" />
          <button disabled={state === "busy"} className="bg-brand-600 px-5 text-sm font-semibold hover:bg-brand-500 disabled:opacity-60">{t.btn}</button>
        </form>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {t.perks.map((p, i) => {
            const I = perkIcons[i];
            return (
              <li key={p} className="flex items-center gap-2 text-sm font-medium">
                <I className="size-5" strokeWidth={1.5} /> {p}
              </li>
            );
          })}
        </ul>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm">
        {state === "ok" && t.ok}
        {state === "err" && <span className="text-amber-200">{t.err}</span>}
      </p>
    </section>
  );
}
