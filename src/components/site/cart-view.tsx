"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { fmt, type Dictionary, type Locale } from "@/lib/i18n";
import { money, waLink } from "@/lib/format";
import { useCart, type CartItem } from "./cart";
import { WhatsAppIcon } from "./icons";

type Props = { lang: Locale; t: Dictionary; whatsapp: string; freeMin: number };

export function CartView({ lang, t, whatsapp, freeMin }: Props) {
  const { items, ready, subtotal, setQty, remove, clear } = useCart();
  const [type, setType] = useState<"retail" | "business">("retail");
  const c = t.cart;
  const name = (i: CartItem) => (lang === "ar" ? i.name_ar : i.name_en);
  const comp = (i: CartItem) => (lang === "ar" ? i.company_ar : i.company_en);

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;

  if (items.length === 0)
    return (
      <div className="rounded-3xl border border-dashed border-line p-14 text-center">
        <ShoppingCart className="mx-auto size-12 text-brand-200" strokeWidth={1.25} />
        <p className="mt-4 text-lg font-semibold">{c.empty}</p>
        <Link href={`/${lang}/products`} className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800">
          {c.browse}
        </Link>
      </div>
    );

  // Group lines by company so the warehouse can route each part of the order
  const groups = items.reduce<Record<string, CartItem[]>>((g, i) => {
    (g[comp(i)] ||= []).push(i);
    return g;
  }, {});

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const lines = [t.wa.order, ""];
    for (const [company, list] of Object.entries(groups)) {
      lines.push(`*${company}*`);
      list.forEach((i) => lines.push(`• ${name(i)}${i.pack_size ? ` (${i.pack_size})` : ""} × ${i.qty} = ${money(i.price * i.qty, lang)}`));
      lines.push("");
    }
    lines.push(`${t.wa.total}: ${money(subtotal, lang)}`, "");
    lines.push(`${t.wa.customer}: ${type === "business" ? c.business : c.retail}`);
    for (const key of ["name", "phone", "area", "notes"] as const) {
      const v = String(f.get(key) || "").trim();
      if (v) lines.push(`${c[key]}: ${v}`);
    }
    window.open(waLink(whatsapp, lines.join("\n")), "_blank", "noopener");
  }

  const remaining = Math.max(0, freeMin - subtotal);
  const input = "h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {Object.entries(groups).map(([company, list]) => (
          <section key={company} className="rounded-2xl border border-line">
            <h2 className="border-b border-line bg-surface px-4 py-3 text-sm font-bold">{company}</h2>
            <ul className="divide-y divide-line">
              {list.map((i) => (
                <li key={i.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                  <Link href={`/${lang}/products/${i.slug}`} className="relative size-16 shrink-0 sm:size-20">
                    {i.image_url && <Image src={i.image_url} alt="" fill sizes="80px" className="object-contain" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/${lang}/products/${i.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-700">{name(i)}</Link>
                    <p className="text-xs text-muted">{i.pack_size}</p>
                    <p className="mt-1 text-sm font-bold">{money(i.price, lang)}</p>
                  </div>
                  <div className="flex items-center rounded-lg border border-line">
                    <button type="button" className="grid size-9 place-items-center text-muted hover:text-ink disabled:opacity-40" onClick={() => setQty(i.id, i.qty - 1)} disabled={i.qty <= 1} aria-label="−"><Minus className="size-3.5" /></button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">{i.qty}</span>
                    <button type="button" className="grid size-9 place-items-center text-muted hover:text-ink" onClick={() => setQty(i.id, i.qty + 1)} aria-label="+"><Plus className="size-3.5" /></button>
                  </div>
                  <button type="button" onClick={() => remove(i.id)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600" aria-label={c.remove}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <button type="button" onClick={clear} className="text-sm font-semibold text-muted hover:text-red-600">{c.clear}</button>
      </div>

      <form onSubmit={send} className="h-fit space-y-4 rounded-2xl border border-line p-5 lg:sticky lg:top-4">
        <div className="flex items-center justify-between text-lg font-extrabold">
          <span>{c.subtotal}</span>
          <span>{money(subtotal, lang)}</span>
        </div>
        <p className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${remaining ? "bg-surface text-muted" : "bg-brand-50 font-semibold text-brand-700"}`}>
          <Truck className="size-4 shrink-0" />
          {remaining ? fmt(c.toFree, { amount: remaining.toFixed(2) }) : c.freeDelivery}
        </p>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{c.customerType}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["retail", "business"] as const).map((v) => (
              <label key={v} className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-semibold ${type === v ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line"}`}>
                <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
                {c[v]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">{c.name}</span>
          <input name="name" autoComplete="name" className={input} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{c.phone}</span>
          <input name="phone" type="tel" autoComplete="tel" dir="ltr" className={`${input} text-start`} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{c.area}</span>
          <input name="area" autoComplete="address-level2" className={input} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{c.notes}</span>
          <textarea name="notes" rows={2} className={`${input} h-auto py-2`} />
        </label>

        <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] font-semibold text-white hover:brightness-95">
          <WhatsAppIcon className="size-5" /> {c.send}
        </button>
        <p className="text-xs leading-relaxed text-muted">{c.sendNote}</p>
      </form>
    </div>
  );
}
