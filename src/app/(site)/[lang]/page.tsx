import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Headset, ShieldCheck, Store, Truck } from "lucide-react";
import { fmt, getDictionary, hasLocale, tr } from "@/lib/i18n";
import { getActiveBanner, getBestSellers, getCategories, getCompanies, getMaxDiscount, getSettings } from "@/lib/data";
import { waLink } from "@/lib/format";
import { ProductCard } from "@/components/site/product-card";
import { Arrow, CategoryStrip, FeaturesStrip, OfferBanner, SectionHeading, TrustBadge } from "@/components/site/sections";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [settings, categories, best, banner, companies, maxOff] = await Promise.all([
    getSettings(),
    getCategories(),
    getBestSellers(),
    getActiveBanner(),
    getCompanies(),
    getMaxDiscount(),
  ]);
  const activeCompanies = companies.filter((c) => c.is_active);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface to-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#ffffff_0,transparent_45%)]" />
        <div className="container-x relative grid items-center gap-8 pb-24 pt-10 lg:grid-cols-[1fr_1.15fr] lg:pb-28 lg:pt-14">
          <div>
            <h1 className="text-[42px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {t.hero.title1}
              <br />
              <span className="text-brand-600">{t.hero.title2}</span>
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
              {fmt(t.hero.body, { count: activeCompanies.length, year: settings.founded_year })}
            </p>
            <div className="mt-7 grid max-w-lg grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              <TrustBadge icon={ShieldCheck} title={t.hero.genuine[0]} sub={t.hero.genuine[1]} />
              <TrustBadge icon={Truck} title={t.hero.delivery[0]} sub={t.hero.delivery[1]} />
              <TrustBadge icon={Store} title={t.hero.wholesale[0]} sub={t.hero.wholesale[1]} />
              <TrustBadge icon={Headset} title={t.hero.support[0]} sub={t.hero.support[1]} />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${lang}/products`} className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-700 px-7 font-semibold text-white shadow-sm hover:bg-brand-800">
                {t.hero.shop} <Arrow lang={lang} />
              </Link>
              <a
                href={waLink(settings.whatsapp, t.wa.prescription)}
                target="_blank"
                rel="noopener"
                className="inline-flex h-12 items-center gap-2 rounded-xl border-2 border-brand-600 bg-white px-6 font-semibold text-brand-700 hover:bg-brand-50"
              >
                {t.hero.prescription} <FileText className="size-4" />
              </a>
            </div>
          </div>

          <div className="relative">
            {maxOff > 0 && (
              <div className="absolute start-[4%] top-0 z-10 grid size-32 place-items-center rounded-full border-2 border-dashed border-brand-200 bg-white/90 text-center shadow-card sm:size-40">
                <div className="leading-none">
                  <p className="text-xs font-bold tracking-wider text-brand-700">{t.hero.upTo}</p>
                  <p className="my-1 text-4xl font-extrabold text-brand-700 sm:text-5xl">{maxOff}%</p>
                  <p className="text-sm font-extrabold text-brand-700 sm:text-base">{t.hero.off}</p>
                  <p className="mt-1 text-[10px] font-medium text-muted sm:text-[11px]">{t.hero.onAll}</p>
                </div>
              </div>
            )}
            <Image src="/seed/hero.webp" alt="" width={1100} height={820} priority sizes="(min-width: 1024px) 640px, 100vw" className="h-auto w-full" />
          </div>
        </div>
      </section>

      <div className="container-x relative z-10 -mt-16">
        <CategoryStrip categories={categories} lang={lang} t={t} />
      </div>

      {best.length > 0 && (
        <section className="container-x mt-12">
          <SectionHeading title={t.best.title} href={`/${lang}/products`} linkLabel={t.best.viewAll} lang={lang} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {best.slice(0, 6).map((p, i) => (
              <ProductCard key={p.id} p={p} lang={lang} t={t} priority={i < 2} />
            ))}
          </div>
        </section>
      )}

      {/* 3D store promo */}
      <section className="container-x mt-12">
        <Link
          href={`/${lang}/store`}
          className="group relative grid items-center gap-6 overflow-hidden rounded-3xl bg-brand-800 p-6 text-white sm:p-10 lg:grid-cols-[1fr_auto]"
        >
          <div className="relative max-w-xl">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">{t.store.promoEyebrow}</span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{t.store.promoTitle}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-white/80">{t.store.promoBody}</p>
            <span className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-brand-800 transition-colors group-hover:bg-brand-50">
              {t.store.promoCta} <Arrow lang={lang} />
            </span>
          </div>
          {/* a row of mini shelves, one per company, in each company's colour */}
          <div className="relative flex items-end gap-3" aria-hidden>
            {activeCompanies.slice(0, 6).map((c, i) => (
              <div key={c.id} className="w-14 rounded-t-lg bg-white/10 p-1.5 transition-transform duration-300 group-hover:-translate-y-1 sm:w-16" style={{ transitionDelay: `${i * 40}ms` }}>
                <div className="mb-1.5 h-2.5 rounded-sm" style={{ background: c.brand_color }} />
                {[0, 1, 2].map((row) => (
                  <div key={row} className="mb-1 flex gap-1 border-b-2 border-white/25 pb-1">
                    <span className="h-3 flex-1 rounded-sm bg-white/70" />
                    <span className="h-3 flex-1 rounded-sm" style={{ background: c.brand_color }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Link>
      </section>

      <section className="container-x mt-10">
        <FeaturesStrip t={t} settings={settings} />
      </section>

      {/* Companies */}
      <section className="container-x mt-12">
        <SectionHeading title={t.companies.title} href={`/${lang}/companies`} linkLabel={t.common.viewAll} lang={lang} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {activeCompanies.map((c) => (
            <Link
              key={c.id}
              href={`/${lang}/companies/${c.slug}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-5 text-center transition-shadow hover:shadow-lift"
            >
              {c.logo_url && <Image src={c.logo_url} alt="" width={72} height={72} className="size-16 rounded-2xl transition-transform group-hover:scale-105" />}
              <span>
                <span className="block font-bold text-ink">{tr(c, "name", lang)}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{fmt(t.companies.products, { count: c.product_count })}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {banner && (
        <div className="container-x mt-12">
          <OfferBanner banner={banner} lang={lang} />
        </div>
      )}
    </>
  );
}
