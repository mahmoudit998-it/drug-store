"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Mouse, Star } from "lucide-react";
import { fmt, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { compactCount, discountPct, money } from "@/lib/format";
import type { ProductWithRefs } from "@/lib/types";
import { AddToCartButton } from "./cart-buttons";
import { ProductCard, toCartItem } from "./product-card";
import { Arrow } from "./sections";

/** Scroll distance (in viewport heights) spent on each card. */
const STEP_VH = 62;

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

/**
 * Where card `i` sits when the deck is at position `p` (fractional card index).
 * The current card faces the viewer; the next ones recede in a rising stack towards the
 * end side, and the ones already seen slide out towards the start side and fade.
 */
function cardStyle(d: number, w: number, side: 1 | -1, compact: boolean) {
  if (d >= 0) {
    const decay = 0.7;
    const reach = (1 - Math.pow(decay, d)) / (1 - decay); // 0, 1, 1.7, 2.19 ... (eases out)
    const x = reach * w * (compact ? 0.36 : 0.64);
    const y = -reach * (compact ? 14 : 44);
    const z = -d * (compact ? 80 : 110);
    const rot = -Math.min(d, 1) * 14 - Math.max(0, d - 1) * 3;
    const scale = Math.max(0.6, 1 - d * 0.08);
    const opacity = d > 4 ? Math.max(0, 1 - (d - 4)) : 1;
    return { x: x * side, y, z, rot: rot * side, scale, opacity, shade: Math.min(0.62, d * 0.24), zIndex: 100 - Math.round(d * 10) };
  }
  const e = Math.min(1.4, -d);
  return {
    x: -e * w * (compact ? 0.55 : 0.75) * side,
    y: e * 18,
    z: -e * 120,
    rot: e * 16 * side,
    scale: 1 - e * 0.12,
    opacity: Math.max(0, 1 - e * 1.25),
    shade: e * 0.5,
    zIndex: 100 - Math.round(e * 20),
  };
}

function apply(el: HTMLElement, shade: HTMLElement | null, s: ReturnType<typeof cardStyle>) {
  el.style.transform = `perspective(1400px) translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, ${s.z.toFixed(1)}px) rotateY(${s.rot.toFixed(2)}deg) scale(${s.scale.toFixed(4)})`;
  el.style.opacity = s.opacity.toFixed(3);
  el.style.zIndex = String(s.zIndex);
  el.style.visibility = s.opacity < 0.01 ? "hidden" : "visible";
  if (shade) shade.style.opacity = s.shade.toFixed(3);
}

type Props = { products: ProductWithRefs[]; lang: Locale; t: Dictionary };

/**
 * Best sellers as a 3D deck of cards. The section pins to the screen while the page
 * scrolls through it; each stretch of scrolling brings the next card forward, resting on
 * every card for a moment. Arrows, dots and a click on a waiting card jump to it.
 * With reduced motion it falls back to a plain swipeable row.
 */
export function BestSellersDeck(props: Props) {
  const reduced = useReducedMotion();
  return reduced ? <StaticRow {...props} /> : <Deck {...props} />;
}

function Deck({ products, lang, t }: Props) {
  const n = products.length;
  const rtl = lang === "ar";
  const side: 1 | -1 = rtl ? -1 : 1;
  const section = useRef<HTMLElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const shades = useRef<(HTMLDivElement | null)[]>([]);
  const bar = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let current = 0;
    let target = 0;
    let last = performance.now();
    let frame = 0;
    let started = false;

    const read = () => {
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const raw = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) * (n - 1) : 0;
      // rest on each card for part of the scroll, glide between cards for the rest
      const k = Math.min(Math.floor(raw), n - 2);
      const f = raw - k;
      const s = Math.min(1, Math.max(0, (f - 0.18) / 0.64));
      target = n > 1 ? k + s * s * (3 - 2 * s) : 0;
      if (!started) {
        current = target;
        started = true;
      }
    };

    const render = () => {
      const w = cards.current[0]?.offsetWidth ?? 300;
      const compact = window.innerWidth < 768;
      for (let i = 0; i < n; i++) {
        const c = cards.current[i];
        if (c) apply(c, shades.current[i], cardStyle(i - current, w, side, compact));
      }
      if (bar.current) bar.current.style.transform = `scaleX(${n > 1 ? (current / (n - 1)).toFixed(4) : 1})`;
      const idx = Math.round(current);
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      current += (target - current) * (1 - Math.exp(-dt * 9));
      if (Math.abs(target - current) < 0.0005) current = target;
      render();
      frame = current === target ? 0 : requestAnimationFrame(tick);
    };

    const kick = () => {
      read();
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    read();
    render();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      cancelAnimationFrame(frame);
    };
  }, [n, side]);

  const jump = useCallback(
    (i: number) => {
      const el = section.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(n - 1, i));
      const total = el.offsetHeight - window.innerHeight;
      const raw = idx >= n - 1 ? n - 1 : idx + 0.06;
      const top = window.scrollY + el.getBoundingClientRect().top + (n > 1 ? (raw / (n - 1)) * total : 0);
      window.scrollTo({ top, behavior: "smooth" });
    },
    [n]
  );

  const p = products[active];
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;

  return (
    <section
      ref={section}
      aria-roledescription="carousel"
      aria-label={t.best.title}
      className="relative mt-14 bg-[#07130d]"
      style={{ height: `calc(100vh + ${(n - 1) * STEP_VH}vh)`, ["--deck-w" as string]: "clamp(220px, min(calc((100dvh - 205px) / 1.4), 72vw), 350px)" }}
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* soft brand glow behind the deck */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_58%,rgba(18,160,92,.22),transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

        <div className="container-x relative flex h-full flex-col pb-5 pt-6 sm:pt-10 [@media(max-height:720px)]:pt-5">
          {/* heading row */}
          <div className="relative z-[200] flex items-start justify-between gap-4">
            <div>
              <h2 className="max-w-xl text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl [@media(max-height:720px)]:text-4xl">{t.best.title}</h2>
              <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.2em] text-white/45">{fmt(t.best.total, { count: n })}</p>
            </div>
            <p className="shrink-0 text-end font-extrabold tabular-nums leading-none text-white" aria-live="polite">
              <span className="text-5xl sm:text-7xl">{String(active + 1).padStart(2, "0")}</span>
              <span className="ms-1 text-lg text-white/35 sm:text-2xl">/{String(n).padStart(2, "0")}</span>
            </p>
          </div>

          {/* the deck */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 start-[4%] flex items-center sm:start-[10%] lg:start-[22%]">
              <div className="relative h-[calc(var(--deck-w)*1.4)] w-[var(--deck-w)]">
                {products.map((prod, i) => {
                  const isActive = i === active;
                  const init = cardStyle(i, 300, side, false);
                  return (
                    <div
                      key={prod.id}
                      ref={(el) => {
                        cards.current[i] = el;
                      }}
                      className={`absolute inset-0 origin-center will-change-transform [backface-visibility:hidden]`}
                      style={{
                        transform: `perspective(1400px) translate3d(${init.x}px, ${init.y}px, ${init.z}px) rotateY(${init.rot}deg) scale(${init.scale})`,
                        opacity: init.opacity,
                        zIndex: init.zIndex,
                      }}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${i + 1} / ${n}`}
                      aria-hidden={!isActive || undefined}
                    >
                      <div className="h-full" inert={!isActive}>
                        <DeckCard p={prod} lang={lang} t={t} priority={i < 2} />
                      </div>
                      {/* dims the cards waiting in the stack; clicking one brings it forward */}
                      <div
                        ref={(el) => {
                          shades.current[i] = el;
                        }}
                        className="absolute inset-0 rounded-3xl bg-[#07130d]"
                        style={{ opacity: init.shade, pointerEvents: isActive ? "none" : "auto" }}
                        onClick={() => jump(i)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* details of the card in front (larger screens) */}
            {p && (
              <div key={p.id} className="absolute bottom-6 end-0 hidden w-[330px] animate-[deckIn_.5s_ease-out] text-end lg:block">
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-brand-200">
                  {tr(p.company, "name", lang)}
                  {p.category ? ` · ${tr(p.category, "name", lang)}` : ""}
                </p>
                <h3 className="mt-2 text-2xl font-extrabold leading-snug text-white">{tr(p, "name", lang)}</h3>
                {tr(p, "description", lang) && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/60">{tr(p, "description", lang)}</p>}
                <div className="mt-3 flex items-center justify-end gap-3 text-white">
                  <span className="inline-flex items-center gap-1 text-sm text-white/70">
                    <Star className="size-4 fill-star text-star" />
                    <span className="font-semibold text-white">{Number(p.rating).toFixed(1)}</span> ({compactCount(p.reviews_count)})
                  </span>
                  <span className="text-2xl font-extrabold">{money(p.price, lang)}</span>
                </div>
                <Link href={`/${lang}/products/${p.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-200 hover:underline">
                  {t.best.details} <Arrow lang={lang} />
                </Link>
              </div>
            )}
          </div>

          {/* controls */}
          <div className="relative z-[200] flex items-center gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => jump(active - 1)}
                disabled={active === 0}
                aria-label={t.best.prev}
                className="grid size-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:opacity-30"
              >
                <Prev className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => jump(active + 1)}
                disabled={active === n - 1}
                aria-label={t.best.next}
                className="grid size-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:opacity-30"
              >
                <Next className="size-5" />
              </button>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex flex-wrap justify-center gap-1.5">
                {products.map((prod, i) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => jump(i)}
                    aria-label={fmt(t.best.show, { name: tr(prod, "name", lang) })}
                    aria-current={i === active || undefined}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-7 bg-[#2fbf74]" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
                  />
                ))}
              </div>
              <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 sm:inline-flex">
                <Mouse className="size-3.5" /> {t.best.scroll}
              </span>
            </div>
            <Link href={`/${lang}/products`} className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-200 hover:underline sm:inline-flex">
              {t.best.viewAll} <Arrow lang={lang} />
            </Link>
          </div>
          {/* overall progress */}
          <div className="mt-4 h-0.5 overflow-hidden rounded bg-white/10">
            <span ref={bar} className={`block h-full bg-[#2fbf74] ${rtl ? "origin-right" : "origin-left"}`} style={{ transform: "scaleX(0)" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One card of the deck: the product photo on a light stage, and every detail below it on a
 * dark panel (nothing truncated). The photo area shrinks if a long name needs the room.
 */
function DeckCard({ p, lang, t, priority }: { p: ProductWithRefs; lang: Locale; t: Dictionary; priority?: boolean }) {
  const href = `/${lang}/products/${p.slug}`;
  const compare = p.compare_at_price ? Number(p.compare_at_price) : null;
  const off = discountPct(Number(p.price), compare);
  const subtitle = tr(p, "subtitle", lang);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0e1913] text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.8)]">
      <Link href={href} tabIndex={-1} aria-hidden className="relative block min-h-0 flex-1 bg-white">
        {p.image_url && <Image src={p.image_url} alt="" fill sizes="340px" priority={priority} className="object-contain p-[8%]" />}
                {p.requires_prescription && <span className="absolute start-3 top-3 rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">Rx</span>}
        {off > 0 && (
          <span className="absolute end-3 top-3 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">
            {off}% {t.product.off}
          </span>
        )}
      </Link>
      <div className="flex flex-col gap-1 p-4 [@media(max-height:720px)]:p-3.5">
        <Link href={`/${lang}/companies/${p.company.slug}`} className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold uppercase tracking-wider text-brand-200 hover:underline">
          {p.company.logo_url && <Image src={p.company.logo_url} alt="" width={16} height={16} className="size-4 rounded bg-white" />}
          {tr(p.company, "name", lang)}
        </Link>
        <h3 className="text-[17px] font-extrabold leading-snug">
          <Link href={href} className="hover:text-brand-200">
            {tr(p, "name", lang)}
          </Link>
        </h3>
        {subtitle && <p className="text-[13px] leading-snug text-white/60">{subtitle}</p>}
        <span className="inline-flex items-center gap-1 text-[12px] text-white/60">
          <Star className="size-3.5 fill-star text-star" />
          <span className="font-semibold text-white">{Number(p.rating).toFixed(1)}</span>({compactCount(p.reviews_count)})
        </span>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xl font-extrabold">{money(p.price, lang)}</span>
          {off > 0 && compare && <span className="text-[13px] text-white/45 line-through">{money(compare, lang)}</span>}
        </div>
        <div className="mt-2">
          <AddToCartButton item={toCartItem(p)} label={t.product.addToCart} addedLabel={t.product.added} disabled={!p.in_stock} />
        </div>
      </div>
    </article>
  );
}

/** Reduced motion: the same cards in a plain row that scrolls sideways. */
function StaticRow({ products, lang, t }: Props) {
  return (
    <section className="mt-14 bg-[#07130d] py-12">
      <div className="container-x">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{t.best.title}</h2>
          <Link href={`/${lang}/products`} className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-200 hover:underline">
            {t.best.viewAll} <Arrow lang={lang} />
          </Link>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
          {products.map((p, i) => (
            <div key={p.id} className="grid w-60 shrink-0 snap-start sm:w-72">
              <ProductCard p={p} lang={lang} t={t} priority={i < 2} sizes="288px" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
