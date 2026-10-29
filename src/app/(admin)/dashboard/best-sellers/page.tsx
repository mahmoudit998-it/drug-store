import Image from "next/image";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/format";
import { inputCls } from "@/components/admin/ui";
import { moveBestSeller, setBestSeller } from "../actions";

export const metadata = { title: "Best Selling" };

type Row = { id: string; name_en: string; image_url: string | null; price: number; is_active: boolean; company: { name_en: string } | null };

export default async function BestSellers() {
  const { supabase } = await requireAdmin();
  const cols = "id, name_en, image_url, price, is_active, company:companies(name_en)";
  const [{ data: best }, { data: others }] = await Promise.all([
    supabase.from("products").select(cols).eq("is_best_seller", true).order("best_seller_order").returns<Row[]>(),
    supabase.from("products").select(cols).eq("is_best_seller", false).order("name_en").returns<Row[]>(),
  ]);
  const list = best ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Best Selling</h1>
        <p className="text-sm text-muted">Choose which products appear in the “Best Selling Products” row on the home page, and in what order. The first 6 are shown.</p>
      </div>

      <form action={setBestSeller} className="flex flex-wrap gap-3 rounded-2xl border border-line bg-white p-4">
        <input type="hidden" name="value" value="true" />
        <select name="id" required defaultValue="" className={`${inputCls} max-w-md flex-1`} aria-label="Product to add">
          <option value="" disabled>Add a product…</option>
          {others?.map((p) => <option key={p.id} value={p.id}>{p.name_en} — {p.company?.name_en}</option>)}
        </select>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"><Plus className="size-4" /> Add</button>
      </form>

      <ol className="divide-y divide-line rounded-2xl border border-line bg-white">
        {list.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-4 px-4 py-3 ${i >= 6 ? "opacity-60" : ""}`}>
            <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>
            <span className="relative size-12 shrink-0">{p.image_url && <Image src={p.image_url} alt="" fill sizes="48px" className="object-contain" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{p.name_en}</span>
              <span className="block text-xs text-muted">
                {p.company?.name_en} · {money(p.price, "en")}
                {!p.is_active && <span className="ms-2 rounded bg-amber-100 px-1.5 font-semibold text-amber-800">Hidden from site</span>}
                {i >= 6 && <span className="ms-2">· not shown (only first 6)</span>}
              </span>
            </span>
            <div className="flex gap-1">
              {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={moveBestSeller}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="dir" value={dir} />
                  <button disabled={dir === "up" ? i === 0 : i === list.length - 1} className="grid size-9 place-items-center rounded-lg border border-line hover:bg-surface disabled:opacity-30" aria-label={`Move ${dir}`}>
                    {dir === "up" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                  </button>
                </form>
              ))}
              <form action={setBestSeller}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="value" value="false" />
                <button className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove from Best Selling"><X className="size-4" /></button>
              </form>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="p-10 text-center text-muted">No products selected yet.</li>}
      </ol>
    </div>
  );
}
