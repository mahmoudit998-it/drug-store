"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart, type CartItem } from "./cart";
import type { Locale } from "@/lib/i18n";

export function CartLink({ lang, label }: { lang: Locale; label: string }) {
  const { count, ready } = useCart();
  return (
    <Link href={`/${lang}/cart`} className="relative flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-50" aria-label={label}>
      <span className="relative">
        <ShoppingCart className="size-6 text-ink" strokeWidth={1.75} />
        {ready && count > 0 && (
          <span className="absolute -end-2.5 -top-2.5 grid min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold leading-5 text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="hidden text-sm font-semibold lg:inline">{label}</span>
    </Link>
  );
}

type AddProps = {
  item: Omit<CartItem, "qty">;
  label: string;
  addedLabel: string;
  disabled?: boolean;
  size?: "sm" | "lg";
  withQty?: boolean;
  qtyLabel?: string;
};

export function AddToCartButton({ item, label, addedLabel, disabled, size = "sm", withQty, qtyLabel }: AddProps) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  const onAdd = () => {
    add(item, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const btn =
    size === "lg"
      ? "h-12 px-6 text-base"
      : "h-9 px-3 text-[13px]";

  return (
    <div className={withQty ? "flex items-stretch gap-3" : ""}>
      {withQty && (
        <div className="flex items-center rounded-lg border border-line" role="group" aria-label={qtyLabel}>
          <button type="button" className="grid size-12 place-items-center text-muted hover:text-ink disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="−">
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" className="grid size-12 place-items-center text-muted hover:text-ink" onClick={() => setQty((q) => Math.min(999, q + 1))} aria-label="+">
            <Plus className="size-4" />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className={`${btn} ${withQty ? "flex-1" : "w-full"} inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 font-semibold text-white transition-colors hover:bg-brand-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted/40`}
      >
        {added ? addedLabel : label}
        {added ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
      </button>
    </div>
  );
}
