"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, FileText, Search, ShoppingCart } from "lucide-react";
import { fmt, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { money } from "@/lib/format";
import { useCart } from "../cart";
import { Arrow } from "../sections";
import { QtyStepper, ViewToggle, itemsLabel, toCartItem } from "./shared";
import type { StoreProduct, StoreShelf } from "./types";

/** Plain list of every product, grouped by company, for fast bulk ordering. Shares the same cart. */
export function ClassicView({ lang, t, shelves }: { lang: Locale; t: Dictionary; shelves: StoreShelf[] }) {
  const [q, setQ] = useState("");
  const { count, subtotal, ready } = useCart();
  const s = t.store;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return shelves;
    return shelves
      .map((sh) => ({
        ...sh,
        products: sh.products.filter((p) =>
          [p.name_en, p.name_ar, p.active_ingredient, p.subtitle_en, p.subtitle_ar].some((v) => v?.toLowerCase().includes(term))
        ),
      }))
      .filter((sh) => sh.products.length > 0);
  }, [shelves, q]);

  return (
    <div className="container-x pb-28 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight">{s.listTitle}</h1>
          <p className="mt-1.5 text-muted">{s.listIntro}</p>
        </div>
        <ViewToggle t={t} mode="list" className="border border-line" />
      </div>

      <label className="relative mt-6 block max-w-xl">
        <span className="sr-only">{s.search}</span>
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={s.search}
          className="h-12 w-full rounded-xl border border-line bg-white ps-10 pe-4 text-sm outline-none focus:border-brand-500"
        />
      </label>

      {filtered.length === 0 && <p className="mt-10 text-center text-muted">{s.noResults}</p>}

      {filtered.map((sh) => (
        <section key={sh.id} className="mt-8 overflow-hidden rounded-2xl border border-line">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3" style={{ background: `${sh.brand_color}0f` }}>
            {sh.logo_url && <Image src={sh.logo_url} alt="" width={36} height={36} className="size-9 rounded-lg border border-line bg-white" />}
            <h2 className="font-extrabold" style={{ color: sh.brand_color }}>
              {tr(sh, "name", lang)}
            </h2>
            <span className="text-sm text-muted">{fmt(s.products, { count: sh.products.length })}</span>
          </header>
          <ul className="divide-y divide-line">
            {sh.products.map((p) => (
              <Row key={p.id} lang={lang} t={t} p={p} shelf={sh} />
            ))}
          </ul>
        </section>
      ))}

      {ready && count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
          <div className="container-x flex h-16 items-center justify-between gap-4">
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="size-5 text-brand-700" />
              {itemsLabel(t, count)} · <span className="tabular-nums">{money(subtotal, lang)}</span>
            </span>
            <Link href={`/${lang}/cart`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">
              {t.store.checkout} <Arrow lang={lang} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ lang, t, p, shelf }: { lang: Locale; t: Dictionary; p: StoreProduct; shelf: StoreShelf }) {
  const { add, items } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.id === p.id)?.qty ?? 0;

  const onAdd = () => {
    add(toCartItem(p, shelf), qty);
    setQty(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <li className="grid grid-cols-[56px_1fr] items-center gap-x-3 gap-y-3 p-3 sm:grid-cols-[56px_1fr_110px_auto] sm:gap-x-4 sm:px-4">
      <Link href={`/${lang}/products/${p.slug}`} className="relative size-14 overflow-hidden rounded-lg border border-line bg-white">
        {p.image_url && <Image src={p.image_url} alt="" fill sizes="56px" className="object-contain" />}
      </Link>
      <div className="min-w-0">
        <Link href={`/${lang}/products/${p.slug}`} className="line-clamp-1 font-semibold hover:text-brand-700">
          {tr(p, "name", lang)}
        </Link>
        <p className="line-clamp-1 text-[13px] text-muted">
          {[p.active_ingredient, p.pack_size].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]">
          {p.requires_prescription && (
            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-700">
              <FileText className="size-3" /> Rx
            </span>
          )}
          {!p.in_stock && <span className="font-semibold text-red-600">{t.store.unavailable}</span>}
          {inCart > 0 && <span className="font-semibold text-brand-700">{fmt(t.store.inCart, { qty: inCart })}</span>}
        </p>
      </div>
      <p className="col-start-2 text-[15px] font-extrabold tabular-nums sm:col-start-auto">{money(p.price, lang)}</p>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:justify-end">
        <QtyStepper qty={qty} setQty={setQty} label={t.product.quantity} size="sm" />
        <button
          type="button"
          onClick={onAdd}
          disabled={!p.in_stock}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-muted/40 sm:flex-none"
        >
          {added ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
          {added ? t.product.added : t.store.add}
        </button>
      </div>
    </li>
  );
}
