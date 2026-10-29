"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, List, ShoppingCart } from "lucide-react";
import { fmt, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { money } from "@/lib/format";
import { useCart } from "../cart";
import { Arrow } from "../sections";
import { SLOTS, aisleCode, easeStops, rawForStop, stopCount } from "./layout";
import { CheckoutReceipt } from "./checkout-receipt";
import { ClassicView } from "./classic-view";
import { ProductDrawer } from "./product-drawer";
import { ViewToggle, setView, toCartItem, useView } from "./shared";
import type { Flight, Pick, StoreShelf } from "./types";

const StoreScene = dynamic(() => import("./scene"), { ssr: false });

type Props = { lang: Locale; t: Dictionary; shelves: StoreShelf[]; whatsapp: string; freeMin: number };

export function PharmacyStore(props: Props) {
  const mode = useView();
  return mode === "list" ? <ClassicView lang={props.lang} t={props.t} shelves={props.shelves} /> : <Store3D {...props} />;
}

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

const samePick = (a: Pick | null, b: Pick | null) => a?.shelf === b?.shelf && a?.slot === b?.slot;

function Store3D({ lang, t, shelves, whatsapp, freeMin }: Props) {
  const rtl = lang === "ar";
  const s = t.store;
  const stops = stopCount(shelves.length);
  const sectionRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const flightKey = useRef(0);
  const [stop, setStop] = useState(0);
  const [selected, setSelected] = useState<Pick | null>(null);
  const [hovered, setHovered] = useState<Pick | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const webgl = useSyncExternalStore(noop, hasWebgl, () => true);
  const reducedMotion = useReducedMotion();
  const { add, items, count, ready } = useCart();

  // Canvas text (signs, prices) must be drawn after the page fonts have loaded.
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

  const bay = stop >= 1 && stop <= shelves.length ? stop - 1 : -1;
  const shelf = bay >= 0 ? shelves[bay] : null;
  const atCheckout = stop > shelves.length;
  // The drawer belongs to the bay it was opened at; walking on closes it.
  const active = selected && selected.shelf === bay ? selected : null;
  const product = active ? shelves[active.shelf].products[active.slot] : null;
  const tip = hovered && !samePick(hovered, active) ? shelves[hovered.shelf]?.products[hovered.slot] : null;

  const colorById = useMemo(() => {
    const m = new Map<string, string>();
    shelves.forEach((sh) => sh.products.forEach((p) => m.set(p.id, sh.brand_color)));
    return m;
  }, [shelves]);
  const basket = useMemo(
    () => items.flatMap((i) => Array.from({ length: Math.min(i.qty, 24) }, () => colorById.get(i.id) ?? "#0b5d34")).slice(0, 24),
    [items, colorById]
  );

  const addSelected = (qty: number) => {
    if (!active || !product) return;
    add(toCartItem(product, shelves[active.shelf]), qty);
    if (active.slot < SLOTS) {
      const key = ++flightKey.current;
      setFlights((f) => [...f, { key, shelf: active.shelf, slot: active.slot }]);
    }
    setToast({ key: Date.now(), text: fmt(s.added, { product: tr(product, "name", lang) }) });
    setSelected(null);
  };

  const onFlightDone = useCallback((key: number) => setFlights((f) => f.filter((x) => x.key !== key)), []);
  const onHover = useCallback((pick: Pick | null, x?: number, y?: number) => {
    const el = tooltipRef.current;
    if (el && x !== undefined && y !== undefined) el.style.transform = `translate(${x + 16}px, ${y + 18}px)`;
    setHovered((prev) => (samePick(prev, pick) ? prev : pick));
  }, []);
  const price = useCallback((v: number) => money(v, lang), [lang]);
  const labels = useMemo(() => ({ storeName: s.storeName, checkout: s.checkout }), [s.storeName, s.checkout]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const stopLabel = (i: number) => (i === 0 ? s.entrance : i > shelves.length ? s.checkout : tr(shelves[i - 1], "name", lang));
  const stopColor = (i: number) => (i >= 1 && i <= shelves.length ? shelves[i - 1].brand_color : "#0b5d34");

  return (
    <div ref={sectionRef} className="relative" style={{ height: `${stops * 115}vh` }}>
      <div className="sticky top-0 h-dvh overflow-hidden bg-[#edf3ef]">
        {webgl && fontsReady && (
          <div className="absolute inset-0">
            <StoreScene
              shelves={shelves}
              rtl={rtl}
              progress={progress}
              selected={active}
              onPick={setSelected}
              onHover={onHover}
              flights={flights}
              onFlightDone={onFlightDone}
              basket={basket}
              reducedMotion={reducedMotion}
              labels={labels}
              price={price}
            />
          </div>
        )}

        {/* hover tooltip, positioned at the pointer */}
        <div ref={tooltipRef} className="pointer-events-none fixed z-30" style={{ left: 0, top: 0, visibility: tip ? "visible" : "hidden" }}>
          {tip && (
            <div className="flex w-64 items-center gap-3 rounded-xl bg-ink/90 p-2 pe-3 text-white shadow-lift backdrop-blur">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white">
                {tip.image_url && <Image src={tip.image_url} alt="" fill sizes="56px" className="object-contain" />}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{tr(tip, "name", lang)}</span>
                <span className="mt-0.5 block text-[13px] font-extrabold text-brand-200">{money(tip.price, lang)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col">
          {/* top: where you are, view toggle and cart */}
          <div className="flex items-start justify-between gap-3 p-4 max-sm:flex-col-reverse max-sm:items-stretch sm:p-6">
            <div className={`pointer-events-auto max-w-md rounded-2xl bg-white/90 p-4 shadow-card backdrop-blur sm:p-5 ${product || atCheckout ? "max-sm:hidden" : ""}`}>
              {stop === 0 && (
                <>
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{s.title}</h1>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.intro}</p>
                  {!webgl && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{s.noWebgl}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
                    {webgl && (
                      <button type="button" onClick={() => jumpTo(1)} className="inline-flex items-center gap-2 text-brand-700 hover:underline">
                        <ChevronDown className="size-4 motion-safe:animate-bounce" /> {s.scroll}
                      </button>
                    )}
                    <button type="button" onClick={() => setView("list")} className="inline-flex items-center gap-1.5 text-muted hover:text-ink hover:underline">
                      <List className="size-4" /> {s.listTitle}
                    </button>
                  </div>
                </>
              )}
              {shelf && (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{fmt(s.aisle, { code: aisleCode(bay) })}</p>
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
              {atCheckout && <h2 className="text-2xl font-extrabold text-ink">{s.checkout}</h2>}
            </div>

            <div className="pointer-events-auto flex shrink-0 items-center gap-2 max-sm:justify-end">
              <ViewToggle t={t} mode="3d" />
              <Link
                href={`/${lang}/cart`}
                className="relative flex h-12 items-center gap-2 rounded-full bg-white/90 px-4 font-semibold shadow-card backdrop-blur hover:bg-white"
                aria-label={t.header.cart}
              >
                <ShoppingCart className="size-5 text-brand-700" />
                {ready && count > 0 && (
                  <span className="grid min-w-6 place-items-center rounded-full bg-brand-600 px-1.5 text-xs font-bold leading-6 text-white">{count > 99 ? "99+" : count}</span>
                )}
              </Link>
            </div>
          </div>

          <div className="mt-auto">
            {shelf && !product && (
              <div className="pointer-events-auto bg-gradient-to-t from-white via-white/90 to-white/0 pt-6">
                <p className="container-x mb-2 text-sm font-medium text-muted">{s.pick}</p>
                <ul className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:px-6">
                  {shelf.products.map((p, slot) => (
                    <li key={p.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelected({ shelf: bay, slot })}
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
                          <span className="text-[12px] font-semibold text-brand-700">{p.in_stock ? s.select : s.unavailable}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* progress along the aisle */}
            <nav aria-label={s.jump} className={`pointer-events-auto px-4 pb-4 pt-3 sm:px-6 ${shelf && !product ? "bg-white" : ""} ${atCheckout ? "max-sm:hidden" : ""}`}>
              <ol className="mx-auto flex max-w-3xl items-center">
                {Array.from({ length: stops }, (_, i) => (
                  <li key={i} className="flex flex-1 items-center last:flex-none">
                    <button
                      type="button"
                      onClick={() => jumpTo(i)}
                      aria-label={stopLabel(i)}
                      aria-current={i === stop ? "step" : undefined}
                      title={stopLabel(i)}
                      className="group relative grid size-7 shrink-0 place-items-center"
                    >
                      <span
                        className={`block rounded-full transition-all ${i === stop ? "size-4 ring-4 ring-white" : "size-2.5"}`}
                        style={{ background: stopColor(i), opacity: i <= stop ? 1 : 0.4 }}
                      />
                      <span className="absolute top-full mt-0.5 hidden whitespace-nowrap text-[11px] font-semibold text-ink/80 lg:block">{i === stop || i === 0 || i === stops - 1 ? stopLabel(i) : ""}</span>
                    </button>
                    {i < stops - 1 && <span className={`h-0.5 flex-1 rounded ${i < stop ? "bg-brand-600" : "bg-ink/15"}`} />}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>

        {product && shelf && <ProductDrawer key={product.id} lang={lang} t={t} product={product} shelf={shelf} onAdd={addSelected} onClose={() => setSelected(null)} />}

        {atCheckout && <CheckoutReceipt lang={lang} t={t} whatsapp={whatsapp} freeMin={freeMin} />}

        {toast && (
          <div role="status" className="absolute inset-x-0 top-20 z-30 flex justify-center px-4 sm:top-6">
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
