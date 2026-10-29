"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FileText, FlaskConical, Package, ShoppingCart, X } from "lucide-react";
import { tr, type Dictionary, type Locale } from "@/lib/i18n";
import { money } from "@/lib/format";
import { Arrow } from "../sections";
import { QtyStepper } from "./shared";
import type { StoreProduct, StoreShelf } from "./types";

/** Floating product details panel: a side drawer on larger screens, a bottom sheet on phones. */
export function ProductDrawer({
  lang,
  t,
  product: p,
  shelf,
  onAdd,
  onClose,
}: {
  lang: Locale;
  t: Dictionary;
  product: StoreProduct;
  shelf: StoreShelf;
  onAdd: (qty: number) => void;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const name = tr(p, "name", lang);
  const subtitle = tr(p, "subtitle", lang);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={name}
      className="absolute inset-x-0 bottom-0 z-20 max-h-[78dvh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-lift sm:inset-x-auto sm:inset-y-20 sm:bottom-auto sm:end-4 sm:h-fit sm:max-h-[calc(100dvh-10rem)] sm:w-[380px] sm:rounded-3xl"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t.store.close}
        className="absolute end-7 top-7 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-muted shadow-sm hover:bg-surface hover:text-ink"
      >
        <X className="size-5" />
      </button>

      <div>
        <div className="relative mb-4 h-48 w-full overflow-hidden rounded-2xl border border-line bg-white sm:h-60">
          {p.image_url && <Image src={p.image_url} alt={name} fill sizes="(min-width: 640px) 340px, 100vw" className="object-contain p-3" />}
          {p.requires_prescription && <span className="absolute start-3 top-3 rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">Rx</span>}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: shelf.brand_color }}>
            {tr(shelf, "name", lang)}
          </p>
          <h3 className="mt-0.5 text-lg font-extrabold leading-snug text-ink">{name}</h3>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-extrabold">{money(p.price, lang)}</span>
            {p.compare_at_price && p.compare_at_price > p.price && <span className="text-sm text-muted line-through">{money(p.compare_at_price, lang)}</span>}
          </p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line rounded-2xl border border-line text-sm">
        {p.active_ingredient && (
          <div className="flex gap-3 px-3.5 py-2.5">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <dt className="sr-only">{t.product.ingredient}</dt>
            <dd>
              <span className="block text-[12px] text-muted">{t.product.ingredient}</span>
              <span className="font-semibold">{p.active_ingredient}</span>
            </dd>
          </div>
        )}
        {p.pack_size && (
          <div className="flex gap-3 px-3.5 py-2.5">
            <Package className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <dt className="sr-only">{t.product.pack}</dt>
            <dd>
              <span className="block text-[12px] text-muted">{t.product.pack}</span>
              <span className="font-semibold">{p.pack_size}</span>
            </dd>
          </div>
        )}
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <span className={`size-2.5 shrink-0 rounded-full ${p.in_stock ? "bg-brand-500" : "bg-red-500"}`} />
          <span className="font-semibold">{p.in_stock ? t.product.inStock : t.product.outOfStock}</span>
        </div>
      </dl>

      {p.requires_prescription && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
          <FileText className="size-4 shrink-0" /> {t.product.rx}
        </p>
      )}

      <div className="mt-4 flex items-stretch gap-3">
        <QtyStepper qty={qty} setQty={setQty} label={t.product.quantity} />
        <button
          type="button"
          autoFocus
          disabled={!p.in_stock}
          onClick={() => onAdd(qty)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted/40"
        >
          {p.in_stock ? t.store.addToCart : t.product.outOfStock}
          {p.in_stock && <ShoppingCart className="size-4" />}
        </button>
      </div>
      <Link href={`/${lang}/products/${p.slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        {t.product.details} <Arrow lang={lang} />
      </Link>
    </div>
  );
}
