"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, Truck } from "lucide-react";
import { fmt, type Dictionary, type Locale } from "@/lib/i18n";
import { money, waLink } from "@/lib/format";
import { groupByCompany, orderMessage, type CustomerType } from "@/lib/order";
import { useCart } from "../cart";
import { WhatsAppIcon } from "../icons";
import { Arrow } from "../sections";
import { itemsLabel } from "./shared";

/** POS-style receipt shown at the checkout counter: itemised by company, with a WhatsApp send form. */
export function CheckoutReceipt({ lang, t, whatsapp, freeMin }: { lang: Locale; t: Dictionary; whatsapp: string; freeMin: number }) {
  const { items, count, subtotal, setQty, ready } = useCart();
  const [type, setType] = useState<CustomerType>("retail");
  const c = t.cart;
  const s = t.store;
  const remaining = Math.max(0, freeMin - subtotal);
  const input = "h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500";

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const fields = Object.fromEntries((["name", "phone", "area"] as const).map((k) => [k, String(f.get(k) || "")]));
    window.open(waLink(whatsapp, orderMessage(items, subtotal, lang, t, type, fields)), "_blank", "noopener");
  }

  return (
    <section
      aria-label={s.receipt}
      className="absolute inset-x-0 bottom-0 z-20 max-h-[72dvh] overflow-y-auto rounded-t-3xl bg-white shadow-lift sm:inset-x-auto sm:bottom-auto sm:end-4 sm:top-20 sm:max-h-[calc(100dvh-7rem)] sm:w-[400px] sm:rounded-3xl"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-dashed border-line bg-white px-5 py-4">
        <div>
          <h2 className="text-lg font-extrabold">{s.receipt}</h2>
          <p className="text-[13px] text-muted">{s.storeName}</p>
        </div>
        {ready && count > 0 && <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">{itemsLabel(t, count)}</span>}
      </header>

      {!ready || items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[15px] text-muted">{s.receiptEmpty}</p>
      ) : (
        <div className="px-5 pb-5">
          {groupByCompany(items, lang).map(([company, list]) => (
            <div key={company} className="border-b border-dashed border-line py-3">
              <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-muted">{company}</h3>
              <ul className="space-y-1.5">
                {list.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{lang === "ar" ? i.name_ar : i.name_en}</span>
                    <span className="flex items-center rounded-md border border-line">
                      <button type="button" onClick={() => setQty(i.id, i.qty - 1)} disabled={i.qty <= 1} className="grid size-7 place-items-center text-muted hover:text-ink disabled:opacity-40" aria-label="−">
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center text-[13px] font-semibold tabular-nums">{i.qty}</span>
                      <button type="button" onClick={() => setQty(i.id, i.qty + 1)} className="grid size-7 place-items-center text-muted hover:text-ink" aria-label="+">
                        <Plus className="size-3" />
                      </button>
                    </span>
                    <span className="w-24 text-end font-semibold tabular-nums">{money(i.price * i.qty, lang)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex items-center justify-between py-3 text-lg font-extrabold">
            <span>{c.total}</span>
            <span className="tabular-nums">{money(subtotal, lang)}</span>
          </div>
          <p className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${remaining ? "bg-surface text-muted" : "bg-brand-50 font-semibold text-brand-700"}`}>
            <Truck className="size-4 shrink-0" />
            {remaining ? fmt(c.toFree, { amount: remaining.toFixed(2) }) : c.freeDelivery}
          </p>

          <form onSubmit={send} className="mt-4 space-y-3">
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold">{c.customerType}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["retail", "business"] as const).map((v) => (
                  <label key={v} className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-[13px] font-semibold ${type === v ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line"}`}>
                    <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
                    {c[v]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[13px]">
                <span className="mb-1 block font-medium">{c.name}</span>
                <input name="name" autoComplete="name" className={input} />
              </label>
              <label className="block text-[13px]">
                <span className="mb-1 block font-medium">{c.phone}</span>
                <input name="phone" type="tel" autoComplete="tel" dir="ltr" className={`${input} text-start`} />
              </label>
            </div>
            <label className="block text-[13px]">
              <span className="mb-1 block font-medium">{c.area}</span>
              <input name="area" autoComplete="address-level2" className={input} />
            </label>
            <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white hover:brightness-95">
              <WhatsAppIcon className="size-5" /> {c.send}
            </button>
          </form>
          <Link href={`/${lang}/cart`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            {s.openCart} <Arrow lang={lang} />
          </Link>
        </div>
      )}
    </section>
  );
}
