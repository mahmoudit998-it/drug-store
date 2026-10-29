import type { Locale } from "./i18n";

export function money(v: number, lang: Locale) {
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v));
  return lang === "ar" ? `${n} د.إ` : `AED ${n}`;
}

export function discountPct(price: number, compare: number | null) {
  if (!compare || compare <= price) return 0;
  return Math.round((1 - price / compare) * 100);
}

export function compactCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n);
}

/** wa.me link; strips everything but digits from the configured number. */
export function waLink(number: string, text: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export const localHref = (lang: Locale, path = "") => `/${lang}${path}`;
