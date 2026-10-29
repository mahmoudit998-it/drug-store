import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { tr, type Dictionary, type Locale } from "@/lib/i18n";
import { compactCount, discountPct, money } from "@/lib/format";
import type { ProductWithRefs } from "@/lib/types";
import { AddToCartButton } from "./cart-buttons";

export function toCartItem(p: ProductWithRefs) {
  return {
    id: p.id,
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar,
    company_en: p.company.name_en,
    company_ar: p.company.name_ar,
    price: Number(p.price),
    image_url: p.image_url,
    pack_size: p.pack_size,
  };
}

export function ProductCard({ p, lang, t, priority }: { p: ProductWithRefs; lang: Locale; t: Dictionary; priority?: boolean }) {
  const off = discountPct(Number(p.price), p.compare_at_price ? Number(p.compare_at_price) : null);
  const href = `/${lang}/products/${p.slug}`;
  return (
    <article className="group relative flex flex-col rounded-2xl border border-line bg-white p-3 transition-shadow hover:shadow-lift sm:p-4">
      <Link href={href} className="relative mb-3 block aspect-square overflow-hidden rounded-xl bg-white" tabIndex={-1} aria-hidden>
        {p.image_url && (
          <Image
            src={p.image_url}
            alt=""
            fill
            sizes="(min-width: 1280px) 200px, (min-width: 768px) 25vw, 45vw"
            priority={priority}
            className="object-contain p-1 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        )}
        {p.requires_prescription && (
          <span className="absolute start-1 top-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Rx</span>
        )}
      </Link>

      <Link
        href={`/${lang}/companies/${p.company.slug}`}
        className="relative z-10 mb-1 inline-flex max-w-full items-center gap-1.5 self-start rounded-full py-0.5 text-[11px] font-semibold uppercase tracking-wide hover:underline"
        style={{ color: p.company.brand_color }}
      >
        {p.company.logo_url && <Image src={p.company.logo_url} alt="" width={16} height={16} className="size-4 rounded" />}
        <span className="truncate">{tr(p.company, "name", lang)}</span>
      </Link>

      <h3 className="text-[14px] font-bold leading-snug text-ink">
        <Link href={href} className="line-clamp-2 hover:text-brand-700">
          {tr(p, "name", lang)}
        </Link>
      </h3>
      {p.subtitle_en && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{tr(p, "subtitle", lang)}</p>}

      <div className="mt-2 flex items-center gap-1 text-[12px] text-muted">
        <Star className="size-3.5 fill-star text-star" />
        <span className="font-semibold text-ink">{Number(p.rating).toFixed(1)}</span>
        <span>({compactCount(p.reviews_count)})</span>
      </div>

      <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-2">
        <span className="text-[15px] font-extrabold text-ink">{money(p.price, lang)}</span>
        {off > 0 && (
          <>
            <span className="text-[12px] text-muted line-through">{money(Number(p.compare_at_price), lang)}</span>
            <span className="ms-auto text-[12px] font-bold text-brand-600">
              {off}% {t.product.off}
            </span>
          </>
        )}
      </div>

      <div className="mt-3">
        <AddToCartButton item={toCartItem(p)} label={t.product.addToCart} addedLabel={t.product.added} disabled={!p.in_stock} />
      </div>
    </article>
  );
}
