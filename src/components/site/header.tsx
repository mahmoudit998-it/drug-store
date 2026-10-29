import Image from "next/image";
import { Suspense } from "react";
import Link from "next/link";
import { BadgeCheck, FileText, Headset, ShieldCheck, Truck } from "lucide-react";
import { fmt, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { waLink } from "@/lib/format";
import type { Category, Settings } from "@/lib/types";
import { CartLink } from "./cart-buttons";
import { LanguageSwitch, MobileMenu, NavLinks } from "./header-client";
import { WhatsAppIcon } from "./icons";

type Props = { lang: Locale; t: Dictionary; settings: Settings; categories: Category[] };

export function Header({ lang, t, settings, categories }: Props) {
  const nav = [
    { href: `/${lang}`, label: t.nav.home, exact: true },
    { href: `/${lang}/products`, label: t.nav.products },
    ...categories.slice(0, 5).map((c) => ({ href: `/${lang}/products?category=${c.slug}`, label: tr(c, "name", lang) })),
    { href: `/${lang}/companies`, label: t.nav.companies },
    { href: `/${lang}/products?sale=1`, label: t.nav.offers },
    { href: `/${lang}/about`, label: t.nav.about },
    { href: `/${lang}/contact`, label: t.nav.contact },
  ];

  return (
    <header className="relative z-30 bg-white">
      <div className="bg-brand-800 text-white">
        <div className="container-x flex h-10 items-center justify-between gap-6 text-[13px] font-medium">
          <span className="flex items-center gap-2">
            <Truck className="size-4 shrink-0" strokeWidth={1.75} />
            {fmt(t.topbar.delivery, { min: Number(settings.free_delivery_min) })}
          </span>
          <span className="hidden items-center gap-2 md:flex">
            <ShieldCheck className="size-4" strokeWidth={1.75} /> {t.topbar.genuine}
          </span>
          <span className="hidden items-center gap-2 lg:flex">
            <BadgeCheck className="size-4" strokeWidth={1.75} /> {fmt(t.topbar.since, { year: settings.founded_year })}
          </span>
          <span className="hidden items-center gap-5 sm:flex">
            <a href={waLink(settings.whatsapp, t.wa.general)} target="_blank" rel="noopener" className="flex items-center gap-2 hover:underline">
              <Headset className="size-4" strokeWidth={1.75} /> {t.topbar.support}
            </a>
            <span className="h-4 w-px bg-white/30" />
            <a href={waLink(settings.whatsapp, t.wa.prescription)} target="_blank" rel="noopener" className="flex items-center gap-2 hover:underline">
              <FileText className="size-4" strokeWidth={1.75} /> {t.topbar.prescription}
            </a>
          </span>
        </div>
      </div>

      <div className="container-x flex items-center gap-3 py-4 sm:gap-6">
        <Suspense fallback={<span className="size-10 lg:hidden" />}>
          <MobileMenu nav={nav} lang={lang} label={t.header.menu} />
        </Suspense>
        <Link href={`/${lang}`} className="flex shrink-0 items-center gap-3" aria-label={tr(settings, "site_name", lang)}>
          <Image src="/brand/logo-mark.png" alt="" width={588} height={296} priority className="h-10 w-auto sm:h-12" />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[17px] font-extrabold tracking-tight text-brand-700">{lang === "ar" ? "مستودع الشارقة" : "SHARJAH"}</span>
            <span className="text-[11px] font-semibold tracking-[0.18em] text-brand-600">{lang === "ar" ? "للأدوية ذ.م.م" : "DRUG STORE L.L.C."}</span>
          </span>
        </Link>

        <form action={`/${lang}/products`} className="mx-auto hidden h-12 max-w-[620px] flex-1 items-stretch overflow-hidden rounded-xl border border-line bg-white shadow-sm focus-within:border-brand-500 md:flex" role="search">
          <label className="sr-only" htmlFor="hdr-cat">{t.header.allCategories}</label>
          <select id="hdr-cat" name="category" defaultValue="" className="max-w-44 cursor-pointer border-e border-line bg-surface ps-4 pe-2 text-sm font-semibold text-ink outline-none">
            <option value="">{t.header.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{tr(c, "name", lang)}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="hdr-q">{t.header.search}</label>
          <input id="hdr-q" name="q" type="search" placeholder={t.header.search} className="min-w-0 flex-1 px-4 text-sm outline-none placeholder:text-muted/80" />
          <button className="m-1 rounded-lg bg-brand-700 px-6 text-sm font-semibold text-white hover:bg-brand-800">{t.header.searchBtn}</button>
        </form>

        <div className="ms-auto flex items-center gap-1 sm:gap-3 md:ms-0">
          <a href={waLink(settings.whatsapp, t.wa.general)} target="_blank" rel="noopener" className="hidden items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-brand-50 xl:flex">
            <span className="grid size-9 place-items-center rounded-full bg-[#25D366] text-white"><WhatsAppIcon className="size-5" /></span>
            <span className="flex flex-col text-start leading-tight">
              <span className="text-xs text-muted">{t.header.orderWhatsapp}</span>
              <span className="text-sm font-semibold">{t.header.whatsapp}</span>
            </span>
          </a>
          <Suspense>
            <LanguageSwitch lang={lang} label={t.header.language} />
          </Suspense>
          <CartLink lang={lang} label={t.header.cart} />
        </div>
      </div>

      <form action={`/${lang}/products`} className="container-x pb-3 md:hidden" role="search">
        <div className="flex h-11 overflow-hidden rounded-xl border border-line focus-within:border-brand-500">
          <input name="q" type="search" placeholder={t.header.search} aria-label={t.header.search} className="min-w-0 flex-1 px-4 text-sm outline-none" />
          <button className="m-1 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white">{t.header.searchBtn}</button>
        </div>
      </form>

      <nav className="hidden border-y border-line lg:block" aria-label="Main">
        <Suspense fallback={<div className="h-12" />}>
          <NavLinks nav={nav} />
        </Suspense>
      </nav>
    </header>
  );
}
