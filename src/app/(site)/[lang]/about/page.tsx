import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Sparkles, Truck } from "lucide-react";
import { fmt, getDictionary, hasLocale } from "@/lib/i18n";
import { getCompanies, getProducts, getSettings } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).nav.about } : {};
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [settings, companies, products] = await Promise.all([getSettings(), getCompanies(), getProducts()]);
  const years = new Date().getFullYear() - settings.founded_year;
  const stats = [
    [`${years}+`, t.about.stats.years],
    [companies.filter((c) => c.is_active).length, t.about.stats.companies],
    [`${products.length}+`, t.about.stats.products],
    [7, t.about.stats.emirates],
  ];
  const icons = [ShieldCheck, Sparkles, Truck];

  return (
    <div className="container-x py-12">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-600">{t.common.since} {settings.founded_year}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">{t.about.title}</h1>
          <p className="mt-5 text-lg font-medium text-ink">{fmt(t.about.lead, { year: settings.founded_year })}</p>
          {t.about.body.map((b) => <p key={b} className="mt-4 leading-relaxed text-muted">{b}</p>)}
        </div>
        <div className="grid place-items-center rounded-3xl bg-surface p-10">
          <Image src="/brand/logo-full.png" alt={lang === "ar" ? settings.site_name_ar : settings.site_name_en} width={1084} height={592} className="h-auto w-full max-w-md" />
        </div>
      </div>

      <dl className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([v, label]) => (
          <div key={label} className="rounded-2xl bg-brand-800 p-6 text-white">
            <dd className="text-4xl font-extrabold">{v}</dd>
            <dt className="mt-1 text-sm text-white/75">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {t.about.values.map(([title, body], i) => {
          const I = icons[i];
          return (
            <div key={title} className="rounded-2xl border border-line p-6">
              <I className="size-9 text-brand-600" strokeWidth={1.4} />
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
