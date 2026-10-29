import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, FileWarning, PackageCheck, Star, Store, Truck } from "lucide-react";
import { fmt, getDictionary, hasLocale, tr } from "@/lib/i18n";
import { getProduct, getProducts, getSettings } from "@/lib/data";
import { compactCount, discountPct, money, waLink } from "@/lib/format";
import { AddToCartButton } from "@/components/site/cart-buttons";
import { ProductCard, toCartItem } from "@/components/site/product-card";
import { SectionHeading } from "@/components/site/sections";
import { WhatsAppIcon } from "@/components/site/icons";

export async function generateMetadata({ params }: PageProps<"/[lang]/products/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const p = await getProduct(slug);
  if (!p) return {};
  return {
    title: `${tr(p, "name", lang)} — ${tr(p.company, "name", lang)}`,
    description: tr(p, "description", lang).slice(0, 160),
    openGraph: p.image_url ? { images: [p.image_url] } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/[lang]/products/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const p = await getProduct(slug);
  if (!p) notFound();
  const t = getDictionary(lang);
  const [settings, related] = await Promise.all([getSettings(), getProducts({ companyId: p.company_id, excludeId: p.id, limit: 4 })]);

  const name = tr(p, "name", lang);
  const company = tr(p.company, "name", lang);
  const off = discountPct(Number(p.price), p.compare_at_price ? Number(p.compare_at_price) : null);
  const companyHref = `/${lang}/companies/${p.company.slug}`;

  const specs = [
    [t.product.company, <Link key="c" href={companyHref} className="font-semibold text-brand-700 hover:underline">{company}</Link>],
    p.category && [t.product.category, <Link key="k" href={`/${lang}/products?category=${p.category.slug}`} className="hover:underline">{tr(p.category, "name", lang)}</Link>],
    p.active_ingredient && [t.product.ingredient, p.active_ingredient],
    p.pack_size && [t.product.pack, p.pack_size],
  ].filter(Boolean) as [string, React.ReactNode][];

  return (
    <div className="container-x py-8">
      <nav className="mb-6 flex flex-wrap gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        <Link href={`/${lang}`} className="hover:text-brand-700">{t.common.home}</Link><span>/</span>
        <Link href={`/${lang}/products`} className="hover:text-brand-700">{t.listing.title}</Link><span>/</span>
        <Link href={companyHref} className="hover:text-brand-700">{company}</Link><span>/</span>
        <span className="text-ink">{name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-white">
          {p.image_url && <Image src={p.image_url} alt={name} fill priority sizes="(min-width: 1024px) 600px, 100vw" className="object-contain p-8" />}
          {off > 0 && <span className="absolute start-4 top-4 rounded-full bg-brand-600 px-3 py-1 text-sm font-bold text-white">{off}% {t.product.off}</span>}
        </div>

        <div>
          <Link href={companyHref} className="inline-flex items-center gap-2.5 rounded-full border border-line py-1 pe-4 ps-1 hover:border-brand-200 hover:bg-brand-50">
            {p.company.logo_url && <Image src={p.company.logo_url} alt="" width={28} height={28} className="size-7 rounded-full" />}
            <span className="text-sm font-semibold" style={{ color: p.company.brand_color }}>{company}</span>
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{name}</h1>
          {p.subtitle_en && <p className="mt-2 text-lg text-muted">{tr(p, "subtitle", lang)}</p>}

          <div className="mt-3 flex items-center gap-1.5 text-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className={`size-4 ${i <= Math.round(Number(p.rating)) ? "fill-star text-star" : "text-line"}`} />
            ))}
            <span className="ms-1 font-semibold">{Number(p.rating).toFixed(1)}</span>
            <span className="text-muted">({compactCount(p.reviews_count)} {t.product.reviews})</span>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold">{money(p.price, lang)}</span>
            {off > 0 && <span className="text-lg text-muted line-through">{money(Number(p.compare_at_price), lang)}</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${p.in_stock ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`}>
              <PackageCheck className="size-4" /> {p.in_stock ? t.product.inStock : t.product.outOfStock}
            </span>
            {p.requires_prescription && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
                <FileWarning className="size-4" /> {t.product.rx}
              </span>
            )}
          </div>

          <div className="mt-7 space-y-3">
            <AddToCartButton item={toCartItem(p)} label={t.product.addToCart} addedLabel={t.product.added} disabled={!p.in_stock} size="lg" withQty qtyLabel={t.product.quantity} />
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={waLink(settings.whatsapp, fmt(t.wa.product, { product: name, company }))}
                target="_blank"
                rel="noopener"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#25D366] font-semibold text-white hover:brightness-95"
              >
                <WhatsAppIcon className="size-5" /> {t.product.orderNow}
              </a>
              <a
                href={waLink(settings.whatsapp, fmt(t.wa.wholesale, { product: name, company }))}
                target="_blank"
                rel="noopener"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-brand-600 font-semibold text-brand-700 hover:bg-brand-50"
              >
                <Store className="size-5" /> {t.product.wholesale}
              </a>
            </div>
            <p className="text-[13px] text-muted">{t.product.wholesaleNote}</p>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 text-sm">
            <li className="flex items-center gap-2"><BadgeCheck className="size-5 text-brand-600" />{t.hero.genuine.join(" ")}</li>
            <li className="flex items-center gap-2"><Truck className="size-5 text-brand-600" />{t.hero.delivery.join(" ")}</li>
          </ul>

          <div className="mt-8">
            <h2 className="mb-3 text-lg font-bold">{t.product.details}</h2>
            {p.description_en && <p className="leading-relaxed text-muted">{tr(p, "description", lang)}</p>}
            <dl className="mt-5 divide-y divide-line rounded-2xl border border-line">
              {specs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading title={fmt(t.product.related, { company })} href={companyHref} linkLabel={t.product.visitCompany} lang={lang} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} lang={lang} t={t} />)}
          </div>
        </section>
      )}
    </div>
  );
}
