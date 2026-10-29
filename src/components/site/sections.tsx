import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgePercent, Check, Headset, ShieldCheck, Truck, BadgeCheck, Store } from "lucide-react";
import { fmt, tr, type Dictionary, type Locale } from "@/lib/i18n";
import type { Banner, Category, Settings } from "@/lib/types";
import { CategoryIcon } from "./icons";

export const Arrow = ({ lang, className = "size-4" }: { lang: Locale; className?: string }) =>
  lang === "ar" ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

export function SectionHeading({ title, href, linkLabel, lang }: { title: string; href?: string; linkLabel?: string; lang: Locale }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h2>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          {linkLabel} <Arrow lang={lang} />
        </Link>
      )}
    </div>
  );
}

export function CategoryStrip({ categories, lang, t }: { categories: Category[]; lang: Locale; t: Dictionary }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-2 shadow-card sm:p-3">
      <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:grid lg:grid-cols-9">
        {categories.slice(0, 8).map((c) => (
          <li key={c.id} className="shrink-0 lg:shrink">
            <Link
              href={`/${lang}/products?category=${c.slug}`}
              className="flex h-full w-28 flex-col items-center gap-2.5 rounded-xl px-2 py-3 text-center transition-colors hover:bg-brand-50 lg:w-auto"
            >
              <CategoryIcon name={c.icon} className="size-9 text-brand-600" />
              <span className="text-[13px] font-semibold leading-tight text-ink">{tr(c, "name", lang)}</span>
            </Link>
          </li>
        ))}
        <li className="shrink-0 lg:shrink">
          <Link
            href={`/${lang}/products`}
            className="flex h-full w-28 flex-col items-center justify-center gap-2 rounded-xl bg-brand-50 px-2 py-3 text-center text-[13px] font-bold text-brand-700 hover:bg-brand-100 lg:w-auto"
          >
            {t.categories.all}
            <Arrow lang={lang} />
          </Link>
        </li>
      </ul>
    </div>
  );
}

const featureIcons = [Truck, ShieldCheck, Store, BadgePercent, Headset];

export function FeaturesStrip({ t, settings }: { t: Dictionary; settings: Settings }) {
  return (
    <ul className="grid grid-cols-2 gap-y-5 rounded-2xl bg-brand-50 px-4 py-6 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-brand-100 rtl:lg:divide-x-reverse">
      {t.features.map(([title, sub], i) => {
        const Icon = featureIcons[i];
        return (
          <li key={title} className="flex items-center gap-3 px-2 lg:justify-center">
            <Icon className="size-9 shrink-0 text-brand-700" strokeWidth={1.4} />
            <span className="leading-tight">
              <span className="block text-sm font-bold text-ink">{title}</span>
              <span className="block text-[13px] text-muted">{fmt(sub, { min: Number(settings.free_delivery_min) })}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function OfferBanner({ banner, lang }: { banner: Banner; lang: Locale }) {
  const bullets = (lang === "ar" ? banner.bullets_ar : banner.bullets_en)?.length ? (lang === "ar" ? banner.bullets_ar : banner.bullets_en) : banner.bullets_en;
  const btn = tr(banner, "button_text", lang);
  const badge = tr(banner, "badge", lang);
  const url = banner.button_url?.startsWith("/") ? `/${lang}${banner.button_url}` : banner.button_url;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-[#eaf3ee] to-brand-100">
      <div className="pointer-events-none absolute -end-20 -top-24 size-80 rounded-full bg-white/50" />
      <div className="relative grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          {banner.eyebrow_en && <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{tr(banner, "eyebrow", lang)}</p>}
          <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">{tr(banner, "title", lang)}</h2>
          {banner.body_en && <p className="mt-3 max-w-md text-[15px] text-muted">{tr(banner, "body", lang)}</p>}
          {bullets?.length > 0 && (
            <ul className="mt-5 space-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm font-medium text-ink">
                  <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-white"><Check className="size-3" strokeWidth={3} /></span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {btn && url && (
            <Link href={url} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800">
              {btn} <Arrow lang={lang} />
            </Link>
          )}
        </div>
        <div className="relative">
          {badge && (
            <div className="absolute start-0 top-0 z-10 grid size-28 rotate-[-8deg] place-items-center rounded-full bg-brand-700 p-3 text-center text-white shadow-lift sm:size-32">
              <span className="text-lg font-extrabold leading-tight sm:text-xl">{badge}</span>
            </div>
          )}
          {banner.image_url && (
            <Image src={banner.image_url} alt="" width={980} height={460} sizes="(min-width: 1024px) 600px, 100vw" className="h-auto w-full" />
          )}
        </div>
      </div>
    </section>
  );
}

export function TrustBadge({ title, sub, icon: Icon = BadgeCheck }: { title: string; sub: string; icon?: typeof BadgeCheck }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-8 shrink-0 text-brand-700" strokeWidth={1.4} />
      <span className="text-[12px] leading-tight">
        <span className="block font-bold text-ink">{title}</span>
        <span className="block text-muted">{sub}</span>
      </span>
    </div>
  );
}
