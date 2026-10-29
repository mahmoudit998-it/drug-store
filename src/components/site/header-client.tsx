"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Globe, Menu, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type NavItem = { href: string; label: string; exact?: boolean };

function useIsActive() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (item: NavItem) => {
    const [path, query] = item.href.split("?");
    if (query) {
      const want = new URLSearchParams(query);
      return pathname === path && [...want].every(([k, v]) => params.get(k) === v);
    }
    if (item.exact) return pathname === path;
    // "All products" is active only when no category/offer filter is applied
    if (path.endsWith("/products")) return pathname === path && !params.get("category") && !params.get("sale");
    return pathname.startsWith(path);
  };
}

export function NavLinks({ nav }: { nav: NavItem[] }) {
  const isActive = useIsActive();
  return (
    <ul className="container-x flex h-12 items-stretch justify-between gap-2 overflow-x-auto scrollbar-none">
      {nav.map((n) => {
        const active = isActive(n);
        return (
          <li key={n.href} className="flex">
            <Link
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center whitespace-nowrap px-1 text-[14px] font-semibold transition-colors hover:text-brand-600 ${active ? "text-brand-600" : "text-ink"}`}
            >
              {n.label}
              {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-brand-600" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function MobileMenu({ nav, lang, label }: { nav: NavItem[]; lang: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" className="grid size-10 place-items-center rounded-lg hover:bg-brand-50 lg:hidden" onClick={() => setOpen(true)} aria-label={label} aria-expanded={open}>
        <Menu className="size-6" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={label}>
          <button className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Close" />
          <div className={`absolute inset-y-0 ${lang === "ar" ? "right-0" : "left-0"} flex w-[84%] max-w-sm flex-col bg-white shadow-lift`}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-bold">{label}</span>
              <button className="grid size-10 place-items-center rounded-lg hover:bg-brand-50" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-3 font-semibold ${isActive(n) ? "bg-brand-50 text-brand-700" : "hover:bg-surface"}`}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export function LanguageSwitch({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const other = lang === "ar" ? "en" : "ar";
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
  const qs = params.toString();
  return (
    <Link
      href={`/${other}${rest}${qs ? `?${qs}` : ""}`}
      hrefLang={other}
      lang={other}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-brand-50"
    >
      <Globe className="size-5 text-brand-600" strokeWidth={1.75} />
      <span className={other === "ar" ? "font-arabic" : ""}>{label}</span>
    </Link>
  );
}
