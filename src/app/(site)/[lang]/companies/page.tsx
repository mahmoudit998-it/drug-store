import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fmt, getDictionary, hasLocale, tr } from "@/lib/i18n";
import { getCompanies } from "@/lib/data";
import { Arrow } from "@/components/site/sections";

export async function generateMetadata({ params }: PageProps<"/[lang]/companies">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).companies.title } : {};
}

export default async function CompaniesPage({ params }: PageProps<"/[lang]/companies">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const companies = (await getCompanies()).filter((c) => c.is_active);

  return (
    <div className="container-x py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.companies.title}</h1>
        <p className="mt-2 text-muted">{t.companies.subtitle}</p>
      </header>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <Link key={c.id} href={`/${lang}/companies/${c.slug}`} className="group overflow-hidden rounded-3xl border border-line bg-white transition-shadow hover:shadow-lift">
            <div className="relative h-32" style={{ background: c.brand_color }}>
              {c.cover_url && <Image src={c.cover_url} alt="" fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />}
            </div>
            <div className="relative px-5 pb-5">
              {c.logo_url && <Image src={c.logo_url} alt="" width={72} height={72} className="-mt-9 mb-3 size-16 rounded-2xl border-4 border-white shadow-card" />}
              <h2 className="text-lg font-bold">{tr(c, "name", lang)}</h2>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{tr(c, "tagline", lang)}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-medium text-muted">{fmt(t.companies.products, { count: c.product_count })}</span>
                <span className="flex items-center gap-1 font-semibold text-brand-700 group-hover:underline">{t.companies.viewProfile} <Arrow lang={lang} /></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
