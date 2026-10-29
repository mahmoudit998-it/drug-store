"use client";

import { useSyncExternalStore } from "react";
import { Box, List, Minus, Plus } from "lucide-react";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { CartItem } from "../cart";
import type { StoreProduct, StoreShelf } from "./types";

export function toCartItem(p: StoreProduct, shelf: StoreShelf): Omit<CartItem, "qty"> {
  return {
    id: p.id,
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar,
    company_en: shelf.name_en,
    company_ar: shelf.name_ar,
    price: p.price,
    image_url: p.image_url,
    pack_size: p.pack_size,
  };
}

export const itemsLabel = (t: Dictionary, count: number) => (count === 1 ? t.store.oneItem : fmt(t.store.items, { count }));

/* ---------- 3D / list view preference (remembered per browser) ---------- */

export type ViewMode = "3d" | "list";
const VIEW_KEY = "sds-store-view";
const listeners = new Set<() => void>();
let current: ViewMode | null = null;

function readView(): ViewMode {
  if (current === null) {
    try {
      current = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "3d";
    } catch {
      current = "3d";
    }
  }
  return current;
}

export function setView(mode: ViewMode) {
  current = mode;
  try {
    localStorage.setItem(VIEW_KEY, mode);
  } catch {}
  listeners.forEach((l) => l());
}

export function useView() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readView,
    () => "3d" as ViewMode
  );
}

export function ViewToggle({ t, mode, className = "" }: { t: Dictionary; mode: ViewMode; className?: string }) {
  const opt = (m: ViewMode, label: string, Icon: typeof Box) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => {
        if (mode === m) return;
        setView(m);
        window.scrollTo({ top: 0 });
      }}
      className={`flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${
        mode === m ? "bg-brand-700 text-white" : "text-ink hover:bg-brand-50"
      }`}
    >
      <Icon className="size-4" />
      <span className={m === "3d" ? "hidden sm:inline" : ""}>{label}</span>
    </button>
  );
  return (
    <div role="group" aria-label={t.store.view} className={`flex rounded-full bg-white/90 p-1 shadow-card backdrop-blur ${className}`}>
      {opt("3d", t.store.view3d, Box)}
      {opt("list", t.store.viewList, List)}
    </div>
  );
}

export function QtyStepper({ qty, setQty, label, size = "md" }: { qty: number; setQty: (q: number) => void; label: string; size?: "sm" | "md" }) {
  const btn = size === "sm" ? "size-9" : "size-12";
  return (
    <div className="flex items-center rounded-xl border border-line bg-white" role="group" aria-label={label}>
      <button type="button" className={`grid ${btn} place-items-center text-muted hover:text-ink disabled:opacity-40`} onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="−">
        <Minus className="size-4" />
      </button>
      <span className="w-7 text-center font-semibold tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button type="button" className={`grid ${btn} place-items-center text-muted hover:text-ink`} onClick={() => setQty(Math.min(999, qty + 1))} aria-label="+">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
