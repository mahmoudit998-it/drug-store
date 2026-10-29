"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, FileText, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { fmt, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { money } from "@/lib/format";
import { useCart } from "../cart";
import { Arrow } from "../sections";
import { SLOTS, easeStops, rawForStop, stopCount } from "./layout";
import type { Pick } from "./scene";
import type { Flight, StoreProduct, StoreShelf } from "./types";

const StoreScene = dynamic(() => import("./scene"), { ssr: false });

type Props = { lang: Locale; t: Dictionary; shelves: StoreShelf[] };

const noop = () => () => {};

let webglCache: boolean | null = null;
function hasWebgl() {
  if (webglCache === null) {
    try {
      const c = document.createElement("canvas");
      webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}

function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

export function PharmacyStore({ lang, t, shelves }: Props) {
  const rtl = lang === "ar";
  const s = t.store;
  const stops = stopCount(shelves.length);
  const sectionRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const flightKey = useRef(0);
  const [stop, setStop] = useState(0);
  const [selected, setSelected] = useState<Pick | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const webgl = useSyncExternalStore(noop, hasWebgl, () => true);
  const reducedMotion = useReducedMotion();
  const { add, items, count, subtotal, ready } = useCart();

  // Canvas text (shelf signs, prices) must be drawn after the page fonts have loaded.
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const raw = total > 0 ? (-el.getBoundingClientRect().top / total) * (stops - 1) : 0;
      const eased = easeStops(raw, stops);
      progress.current = eased;
      setStop(Math.round(eased));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [stops]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  const jumpTo = useCallback(
    (target: number) => {
      const el = sectionRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const top = window.scrollY + el.getBoundingClientRect().top + (rawForStop(target, stops) / (stops - 1)) * total;
      window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    },
    [stops, reducedMotion]
  );

  const shelfIndex = stop >= 1 && stop <= shelves.length ? stop - 1 : -1;
  const shelf = shelfIndex >= 0 ? shelves[shelfIndex] : null;
  // The confirm panel belongs to the shelf it was opened on; moving away closes it.
  const active = selected && selected.shelf === shelfIndex ? selected : null;
  const product = active ? shelves[active.shelf].products[active.slot] : null;

  const colorById = useMemo(() => {
    const m = new Map<string, string>();
    shelves.forEach((sh) => sh.products.forEach((p) => m.set(p.id, sh.brand_color)));
    return m;
  }, [shelves]);
  const basket = useMemo(
    () => items.flatMap((i) => Array.from({ length: Math.min(i.qty, 16) }, () => colorById.get(i.id) ?? "#0b5d34")).slice(0, 16),
    [items, colorById]
  );

  const confirm = (qty: number) => {
    if (!active || !product) return;
    const sh = shelves[active.shelf];
    add(
      {
        id: product.id,
        slug: product.slug,
        name_en: product.name_en,
        name_ar: product.name_ar,
        company_en: sh.name_en,
        company_ar: sh.name_ar,
        price: product.price,
        image_url: product.image_url,
        pack_size: product.pack_size,
      },
      qty
    );
    if (active.slot < SLOTS) {
      const key = ++flightKey.current;
      setFlights((f) => [...f, { key, shelf: active.shelf, slot: active.slot }]);
    }
    setToast({ key: Date.now(), text: fmt(s.added, { product: tr(product, "name", lang) }) });
    setSelected(null);
  };

  const onFlightDone = useCallback((key: number) => setFlights((f) => f.filter((x) => x.key !== key)), []);
  const price = useCallback((v: number) => money(v, lang), [lang]);
  const labels = useMemo(() => ({ storeName: s.storeName, checkout: s.checkout }), [s.storeName, s.checkout]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const stopLabel = (i: number) => (i === 0 ? s.entrance : i > shelves.length ? s.checkout : tr(shelves[i - 1], "name", lang));

  return (
    <div ref={sectionRef} className="relative" style={{ height: `${stops * 110}vh` }}>
      <div className="sticky top-0 h-dvh overflow-hidden bg-[#e9f3ee]">
        {webgl && fontsReady && (
          <div className="absolute inset-0">
            <StoreScene
              shelves={shelves}
              rtl={rtl}
              progress={progress}
              selected={active}
              onPick={setSelected}
              flights={flights}
              onFlightDone={onFlightDone}
              basket={basket}
              reducedMotion={reducedMotion}
              labels={labels}
              price={price}
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex flex-col">
          {/* top bar: where you are + cart */}
          <div className="flex items-start justify-between gap-3 p-4 sm:p-6">
            <div className="pointer-events-auto max-w-md rounded-2xl bg-white/90 p-4 shadow-card backdrop-blur sm:p-5">
              {stop === 0 && (
                <>
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{s.title}</h1>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.intro}</p>
                  {!webgl && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{s.noWebgl}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
                    <button type="button" onClick={() => jumpTo(1)} className="inline-flex items-center gap-2 text-brand-700 hover:underline">
                      <ChevronDown className="size-4 motion-safe:animate-bounce" /> {s.scroll}
                    </button>
                    <Link href={`/${lang}/products`} className="text-muted hover:text-ink hover:underline">
                      {s.listView}
                    </Link>
                  </div>
                </>
              )}
              {shelf && (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{fmt(s.shelf, { n: stop, total: shelves.length })}</p>
                  <div className="mt-2 flex items-center gap-3">
                    {shelf.logo_url && <Image src={shelf.logo_url} alt="" width={48} height={48} className="size-11 rounded-xl border border-line" />}
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-extrabold" style={{ color: shelf.brand_color }}>
                        {tr(shelf, "name", lang)}
                      </h2>
                      <p className="text-sm text-muted">{fmt(s.products, { count: shelf.products.length })}</p>
                    </div>
                  </div>
                  {tr(shelf, "tagline", lang) && <p className="mt-2 hidden text-sm text-muted sm:block">{tr(shelf, "tagline", lang)}</p>}
                  <Link href={`/${lang}/companies/${shelf.slug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                    {t.companies.viewProfile} <Arrow lang={lang} />
                  </Link>
                </>
              )}
              {stop > shelves.length && (
                <>
                  <h2 className="text-2xl font-extrabold text-ink">{s.checkout}</h2>
                  <p className="mt-2 text-[15px] text-muted">
                    {ready && count > 0 ? fmt(s.checkoutBody, { count }) : s.checkoutEmpty}
                  </p>
                  {ready && count > 0 && (
                    <>
                      <p className="mt-3 text-lg font-extrabold">
                        {t.cart.subtotal}: {money(subtotal, lang)}
                      </p>
                      <Link
                        href={`/${lang}/cart`}
                        className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800"
                      >
                        {s.goToCart} <Arrow lang={lang} />
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>

            <Link
              href={`/${lang}/cart`}
              className="pointer-events-auto relative flex h-12 shrink-0 items-center gap-2 rounded-full bg-white/90 px-4 font-semibold shadow-card backdrop-blur hover:bg-white"
              aria-label={t.header.cart}
            >
              <ShoppingCart className="size-5 text-brand-700" />
              <span className="hidden sm:inline">{t.header.cart}</span>
              {ready && count > 0 && (
                <span className="grid min-w-6 place-items-center rounded-full bg-brand-600 px-1.5 text-xs font-bold leading-6 text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </div>

          {/* stop rail */}
          <nav aria-label={s.jump} className={`pointer-events-auto absolute end-4 top-1/2 hidden -translate-y-1/2 ${product ? "" : "lg:block"}`}>
            <ol className="flex flex-col gap-1 rounded-2xl bg-white/85 p-2 shadow-card backdrop-blur">
              {Array.from({ length: stops }, (_, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => jumpTo(i)}
                    aria-current={i === stop ? "step" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-start text-[13px] font-semibold transition-colors ${
                      i === stop ? "bg-brand-50 text-brand-700" : "text-muted hover:text-ink"
                    }`}
                  >
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${i === stop ? "scale-125" : ""}`}
                      style={{ background: i >= 1 && i <= shelves.length ? shelves[i - 1].brand_color : "#0b5d34", opacity: i === stop ? 1 : 0.45 }}
                    />
                    <span className="max-w-40 truncate">{stopLabel(i)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-auto">
            {/* mobile stop dots */}
            <nav aria-label={s.jump} className="pointer-events-auto mb-2 flex justify-center gap-1.5 lg:hidden">
              {Array.from({ length: stops }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={stopLabel(i)}
                  aria-current={i === stop ? "step" : undefined}
                  className="grid size-6 place-items-center"
                >
                  <span className={`block h-2 rounded-full transition-all ${i === stop ? "w-5 bg-brand-700" : "w-2 bg-brand-700/30"}`} />
                </button>
              ))}
            </nav>

            {shelf && !product && <ShelfStrip lang={lang} t={t} shelf={shelf} onChoose={(slot) => setSelected({ shelf: shelfIndex, slot })} />}
          </div>
        </div>

        {product && shelf && (
          <ConfirmPanel key={product.id} lang={lang} t={t} product={product} shelf={shelf} onConfirm={confirm} onCancel={() => setSelected(null)} />
        )}

        {toast && (
          <div role="status" className="absolute inset-x-0 top-20 z-20 flex justify-center px-4 sm:top-6">
            <div key={toast.key} className="flex items-center gap-3 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lift">
              <Check className="size-4 text-brand-200" />
              <span>{toast.text}</span>
              <Link href={`/${lang}/cart`} className="text-brand-200 underline-offset-2 hover:underline">
                {s.viewCart}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShelfStrip({ lang, t, shelf, onChoose }: { lang: Locale; t: Dictionary; shelf: StoreShelf; onChoose: (slot: number) => void }) {
  return (
    <div className="pointer-events-auto bg-gradient-to-t from-white via-white/90 to-white/0 pb-4 pt-6">
      <p className="container-x mb-2 text-sm font-medium text-muted">{t.store.pick}</p>
      <ul className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:px-6">
        {shelf.products.map((p, slot) => (
          <li key={p.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onChoose(slot)}
              className="flex w-60 items-center gap-3 rounded-xl border border-line bg-white p-2 text-start shadow-sm transition-shadow hover:shadow-lift"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white">
                {p.image_url && <Image src={p.image_url} alt="" fill sizes="56px" className="object-contain" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-[13px] font-bold text-ink">{tr(p, "name", lang)}</span>
                <span className="mt-0.5 block text-[13px] font-extrabold" style={{ color: shelf.brand_color }}>
                  {money(p.price, lang)}
                </span>
                <span className="text-[12px] font-semibold text-brand-700">{p.in_stock ? t.store.select : t.store.unavailable}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfirmPanel({
  lang,
  t,
  product: p,
  shelf,
  onConfirm,
  onCancel,
}: {
  lang: Locale;
  t: Dictionary;
  product: StoreProduct;
  shelf: StoreShelf;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(1);
  const name = tr(p, "name", lang);
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={name}
      className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl bg-white p-5 shadow-lift sm:inset-x-auto sm:bottom-auto sm:end-6 sm:top-1/2 sm:w-[360px] sm:-translate-y-1/2 sm:rounded-3xl"
    >
      <button type="button" onClick={onCancel} aria-label={t.store.cancel} className="absolute end-3 top-3 grid size-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
        <X className="size-5" />
      </button>
      <div className="flex gap-4 sm:block">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-white sm:mb-4 sm:h-40 sm:w-full">
          {p.image_url && <Image src={p.image_url} alt="" fill sizes="(min-width: 640px) 320px, 96px" className="object-contain p-2" />}
        </div>
        <div className="min-w-0 pe-8 sm:pe-0">
          <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: shelf.brand_color }}>
            {tr(shelf, "name", lang)}
          </p>
          <h3 className="mt-0.5 text-lg font-extrabold leading-snug text-ink">{name}</h3>
          {p.subtitle_en && <p className="text-sm text-muted">{tr(p, "subtitle", lang)}</p>}
          {p.pack_size && (
            <p className="mt-1 text-[13px] text-muted">
              {t.product.pack}: {p.pack_size}
            </p>
          )}
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-extrabold">{money(p.price, lang)}</span>
            {p.compare_at_price && p.compare_at_price > p.price && <span className="text-sm text-muted line-through">{money(p.compare_at_price, lang)}</span>}
          </p>
        </div>
      </div>

      {p.requires_prescription && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
          <FileText className="size-4 shrink-0" /> {t.product.rx}
        </p>
      )}

      <div className="mt-4 flex items-stretch gap-3">
        <div className="flex items-center rounded-xl border border-line" role="group" aria-label={t.product.quantity}>
          <button type="button" className="grid size-12 place-items-center text-muted hover:text-ink disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="−">
            <Minus className="size-4" />
          </button>
          <span className="w-7 text-center font-semibold tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button type="button" className="grid size-12 place-items-center text-muted hover:text-ink" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="+">
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          autoFocus
          disabled={!p.in_stock}
          onClick={() => onConfirm(qty)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted/40"
        >
          {p.in_stock ? t.store.confirm : t.product.outOfStock}
          {p.in_stock && <ShoppingCart className="size-4" />}
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <button type="button" onClick={onCancel} className="font-semibold text-muted hover:text-ink">
          {t.store.cancel}
        </button>
        <Link href={`/${lang}/products/${p.slug}`} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
          {t.product.details} <Arrow lang={lang} />
        </Link>
      </div>
    </div>
  );
}
