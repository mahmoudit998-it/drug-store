import type { CartItem } from "@/components/site/cart";
import type { Dictionary, Locale } from "./i18n";
import { money } from "./format";

export type CustomerType = "retail" | "business";
export type OrderFields = Partial<Record<"name" | "phone" | "area" | "notes", string>>;

const itemName = (i: CartItem, lang: Locale) => (lang === "ar" ? i.name_ar : i.name_en);
const itemCompany = (i: CartItem, lang: Locale) => (lang === "ar" ? i.company_ar : i.company_en);

/** Cart lines grouped by company, so the warehouse can route each part of the order. */
export function groupByCompany(items: CartItem[], lang: Locale): [string, CartItem[]][] {
  const groups = items.reduce<Record<string, CartItem[]>>((g, i) => {
    (g[itemCompany(i, lang)] ||= []).push(i);
    return g;
  }, {});
  return Object.entries(groups);
}

/** The WhatsApp order message sent to the warehouse. */
export function orderMessage(items: CartItem[], subtotal: number, lang: Locale, t: Dictionary, type: CustomerType, fields: OrderFields) {
  const c = t.cart;
  const lines = [t.wa.order, ""];
  for (const [company, list] of groupByCompany(items, lang)) {
    lines.push(`*${company}*`);
    list.forEach((i) => lines.push(`• ${itemName(i, lang)}${i.pack_size ? ` (${i.pack_size})` : ""} × ${i.qty} = ${money(i.price * i.qty, lang)}`));
    lines.push("");
  }
  lines.push(`${t.wa.total}: ${money(subtotal, lang)}`, "");
  lines.push(`${t.wa.customer}: ${type === "business" ? c.business : c.retail}`);
  for (const key of ["name", "phone", "area", "notes"] as const) {
    const v = (fields[key] || "").trim();
    if (v) lines.push(`${c[key]}: ${v}`);
  }
  return lines.join("\n");
}
