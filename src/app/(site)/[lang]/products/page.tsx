import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { fmt, getDictionary, hasLocale, tr, type Locale } from "@/lib/i18n";
import { getCategories, getCompanies, getProducts } from "@/lib/data";
import { ProductCard } from "@/components/site/product-card";
import { CategoryIcon } from "@/components/site/icons";

type SP = { q?: string; category?: string; company?: string; sort?: string; sale?: string };

export async function generateMetadata({ params }: PageProps<"/[lang]/products">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).listing.title } : {};
}

function hrefWith(lang: Locale, sp: SP, patch: Partial<SP>) {
  const next = { ...sp, ...patch };
  const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
  return `/${lang}/products${qs ? `?${qs}` : ""}`;
}

export default async function ProductsPage({ params, searchParams }: PageProps<"/[lang]/products">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const raw = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const sp: SP = { q: one(raw.q), category: one(raw.category), company: one(raw.company), sort: one(raw.sort), sale: one(raw.sale) };
  const t = getDictionary(lang);

  const [categories, companies, products] = await Promise.all([
    getCategories(),
    getCompanies(),
    getProducts({ q: sp.q, category: sp.category, company: sp.company, sale: sp.sale === "1", sort: sp.sort }),
  ]);
  const activeCompanies = companies.filter((c) => c.is_active);
  const cat = categories.find((c) => c.slug === sp.category);
  const comp = activeCompanies.find((c) => c.slug === sp.company);
  const hasFilters = !!(sp.q || sp.category || sp.company || sp.sale);
  const title = sp.q ? fmt(t.listing.searchFor, { q: sp.q }) : sp.sale ? t.nav.offers : cat ? tr(cat, "name", lang) : comp ? tr(comp, "name", lang) : t.listing.title;

  const chip = (active: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-brand-50 font-semibold text-brand-700" : "text-ink hover:bg-surface"}`;

  const filters = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{t.listing.category}</p>
        <ul className="space-y-0.5">
          <li><Link href={hrefWith(lang, sp, { category: undefined })} className={chip(!sp.category)}>{t.categories.all}</Link></li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={hrefWith(lang, sp, { category: c.slug })} className={chip(sp.category === c.slug)}>
                <span className="flex items-center gap-2"><CategoryIcon name={c.icon} className="size-4 text-brand-600" />{tr(c, "name", lang)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{t.listing.company}</p>
        <ul className="space-y-0.5">
          <li><Link href={hrefWith(lang, sp, { company: undefined })} className={chip(!sp.company)}>{t.listing.allCompanies}</Link></li>
          {activeCompanies.map((c) => (
            <li key={c.id}>
              <Link href={hrefWith(lang, sp, { company: c.slug })} className={chip(sp.company === c.slug)}>
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: c.brand_color }} />{tr(c, "name", lang)}</span>
                <span className="text-xs text-muted">{c.product_count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Link href={hrefWith(lang, sp, { sale: sp.sale ? undefined : "1" })} className={chip(!!sp.sale)}>
        {t.listing.onSale} <span className={`size-4 rounded border ${sp.sale ? "border-brand-600 bg-brand-600" : "border-line"}`} />
      </Link>
    </div>
  );

  return (
    <div className="container-x py-8">
      <nav className="mb-4 text-sm text-muted" aria-label="Breadcrumb">
        <Link href={`/${lang}`} className="hover:text-brand-700">{t.common.home}</Link> <span className="mx-1.5">/</span>
        <span className="text-ink">{t.listing.title}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">{fmt(t.listing.results, { count: products.length })}</p>
        </div>
        <form className="flex items-center gap-2" action={`/${lang}/products`}>
          {Object.entries(sp).filter(([k, v]) => v && k !== "sort").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <label htmlFor="sort" className="text-sm text-muted">{t.listing.sort}</label>
          <select id="sort" name="sort" defaultValue={sp.sort ?? "featured"} className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium">
            {Object.entries(t.listing.sortOptions).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <button className="h-10 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-surface">{t.listing.apply}</button>
        </form>
      </div>

      {hasFilters && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {sp.q && <FilterPill href={hrefWith(lang, sp, { q: undefined })} label={`“${sp.q}”`} />}
          {cat && <FilterPill href={hrefWith(lang, sp, { category: undefined })} label={tr(cat, "name", lang)} />}
          {comp && <FilterPill href={hrefWith(lang, sp, { company: undefined })} label={tr(comp, "name", lang)} />}
          {sp.sale && <FilterPill href={hrefWith(lang, sp, { sale: undefined })} label={t.listing.onSale} />}
          <Link href={`/${lang}/products`} className="text-sm font-semibold text-brand-700 hover:underline">{t.listing.clear}</Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="min-w-0">
          <details className="rounded-xl border border-line p-3 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><SlidersHorizontal className="size-4" /> {t.listing.filters}</summary>
            <div className="mt-4">{filters}</div>
          </details>
          <div className="sticky top-4 hidden lg:block">{filters}</div>
        </aside>
        <div className="min-w-0">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
              <p>{t.listing.empty}</p>
              <Link href={`/${lang}/products`} className="mt-3 inline-block font-semibold text-brand-700 hover:underline">{t.listing.clear}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p, i) => <ProductCard key={p.id} p={p} lang={lang} t={t} priority={i < 4} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPill({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100">
      {label} <X className="size-3.5" />
    </Link>
  );
}
