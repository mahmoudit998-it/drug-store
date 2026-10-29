import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Globe, Mail, Package, Phone } from "lucide-react";
import { fmt, getDictionary, hasLocale, tr } from "@/lib/i18n";
import { getCategories, getCompany, getProducts } from "@/lib/data";
import { ProductCard } from "@/components/site/product-card";

export async function generateMetadata({ params }: PageProps<"/[lang]/companies/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const c = await getCompany(slug);
  return c ? { title: tr(c, "name", lang), description: tr(c, "tagline", lang) } : {};
}

export default async function CompanyPage({ params, searchParams }: PageProps<"/[lang]/companies/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const company = await getCompany(slug);
  if (!company || !company.is_active) notFound();
  const t = getDictionary(lang);
  const sp = await searchParams;
  const catSlug = typeof sp.category === "string" ? sp.category : undefined;

  const [all, categories] = await Promise.all([getProducts({ companyId: company.id }), getCategories()]);
  const usedCats = categories.filter((c) => all.some((p) => p.category_id === c.id));
  const products = catSlug ? all.filter((p) => p.category?.slug === catSlug) : all;
  const name = tr(company, "name", lang);

  const tab = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? "bg-brand-700 text-white" : "bg-surface text-ink hover:bg-brand-50"}`;

  return (
    <div>
      <div className="relative h-44 overflow-hidden sm:h-64" style={{ background: company.brand_color }}>
        {company.cover_url && <Image src={company.cover_url} alt="" fill priority sizes="100vw" className="object-cover" />}
      </div>

      <div className="container-x">
        <div className="relative -mt-14 flex flex-col gap-5 rounded-3xl border border-line bg-white p-5 shadow-card sm:-mt-16 sm:flex-row sm:items-center sm:p-7">
          {company.logo_url && (
            <Image src={company.logo_url} alt="" width={112} height={112} className="size-24 shrink-0 rounded-3xl border-4 border-white shadow-card sm:size-28" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{t.companies.partnerSince}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
            {company.tagline_en && <p className="mt-1 text-muted">{tr(company, "tagline", lang)}</p>}
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:flex-col sm:items-end">
            <li className="flex items-center gap-2"><Package className="size-4 text-brand-600" /> {fmt(t.companies.products, { count: all.length })}</li>
            {company.established_year && <li className="flex items-center gap-2"><CalendarDays className="size-4 text-brand-600" /> {t.companies.established} {company.established_year}</li>}
          </ul>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr]">
          <aside className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-line p-5">
              <h2 className="mb-3 font-bold">{fmt(t.companies.about, { company: name })}</h2>
              <p className="text-sm leading-relaxed text-muted">{tr(company, "description", lang)}</p>
            </section>
            {(company.phone || company.email || company.website) && (
              <section className="rounded-2xl border border-line p-5">
                <h2 className="mb-3 font-bold">{t.companies.contact}</h2>
                <ul className="space-y-2.5 text-sm">
                  {company.phone && <li className="flex items-center gap-2.5"><Phone className="size-4 text-brand-600" /><a dir="ltr" href={`tel:${company.phone.replace(/\s/g, "")}`} className="hover:underline">{company.phone}</a></li>}
                  {company.email && <li className="flex items-center gap-2.5"><Mail className="size-4 text-brand-600" /><a href={`mailto:${company.email}`} className="hover:underline">{company.email}</a></li>}
                  {company.website && <li className="flex items-center gap-2.5"><Globe className="size-4 text-brand-600" /><a href={company.website} target="_blank" rel="noopener" className="hover:underline">{company.website.replace(/^https?:\/\//, "")}</a></li>}
                </ul>
              </section>
            )}
          </aside>

          <section className="min-w-0">
            <h2 className="mb-4 text-xl font-extrabold">{fmt(t.companies.allProducts, { company: name })}</h2>
            {usedCats.length > 1 && (
              <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none">
                <Link href={`/${lang}/companies/${slug}`} className={tab(!catSlug)} scroll={false}>{t.categories.all}</Link>
                {usedCats.map((c) => (
                  <Link key={c.id} href={`/${lang}/companies/${slug}?category=${c.slug}`} className={tab(catSlug === c.slug)} scroll={false}>{tr(c, "name", lang)}</Link>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p, i) => <ProductCard key={p.id} p={p} lang={lang} t={t} priority={i < 4} />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
