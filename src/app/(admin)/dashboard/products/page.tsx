import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Plus, Star } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { money } from "@/lib/format";
import { inputCls } from "@/components/admin/ui";
import { toggleProduct } from "../actions";

export const metadata = { title: "Products" };

export default async function ProductsAdmin({ searchParams }: PageProps<"/dashboard/products">) {
  const { supabase, isAdmin, profile } = await requireSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const companyF = isAdmin && typeof sp.company === "string" ? sp.company : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const saved = typeof sp.saved === "string" ? sp.saved : "";

  let query = supabase
    .from("products")
    .select("id, slug, name_en, name_ar, image_url, price, is_active, in_stock, is_best_seller, company_id, company:companies(name_en, brand_color), category:categories(name_en)")
    .order("company_id")
    .order("name_en");
  if (!isAdmin) query = query.eq("company_id", profile.company_id!);
  if (companyF) query = query.eq("company_id", companyF);
  if (status === "hidden") query = query.eq("is_active", false);
  if (status === "out") query = query.eq("in_stock", false);
  if (q) {
    const term = q.replace(/[%,()*\\]/g, " ");
    query = query.or(`name_en.ilike.%${term}%,name_ar.ilike.%${term}%`);
  }
  const [{ data: products, error }, { data: companies }] = await Promise.all([
    query,
    isAdmin ? supabase.from("companies").select("id, name_en").order("sort_order") : Promise.resolve({ data: [] as { id: string; name_en: string }[] }),
  ]);
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">{isAdmin ? "Products" : "My products"}</h1>
          <p className="text-sm text-muted">{products?.length} products</p>
        </div>
        <Link href="/dashboard/products/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
          <Plus className="size-4" /> Add product
        </Link>
      </div>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <CheckCircle2 className="size-4" /> “{saved}” saved and published to the website.
        </p>
      )}

      <form className="flex flex-wrap gap-3 rounded-2xl border border-line bg-white p-4">
        <input name="q" defaultValue={q} placeholder="Search by name…" className={`${inputCls} max-w-xs`} />
        {isAdmin && (
          <select name="company" defaultValue={companyF} className={`${inputCls} max-w-52`}>
            <option value="">All companies</option>
            {companies?.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
          </select>
        )}
        <select name="status" defaultValue={status} className={`${inputCls} max-w-44`}>
          <option value="">Any status</option>
          <option value="hidden">Hidden from site</option>
          <option value="out">Out of stock</option>
        </select>
        <button className="h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-surface">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line bg-surface text-start text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">Product</th>
              {isAdmin && <th className="px-4 py-3 text-start font-semibold">Company</th>}
              <th className="px-4 py-3 text-start font-semibold">Category</th>
              <th className="px-4 py-3 text-end font-semibold">Price</th>
              <th className="px-4 py-3 text-center font-semibold">On website</th>
              <th className="px-4 py-3 text-center font-semibold">In stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products?.map((p) => {
              const c = p.company as unknown as { name_en: string; brand_color: string } | null;
              const cat = p.category as unknown as { name_en: string } | null;
              return (
                <tr key={p.id} className="hover:bg-surface/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/products/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-brand-700">
                      <span className="relative size-11 shrink-0 rounded-lg border border-line bg-white">
                        {p.image_url && <Image src={p.image_url} alt="" fill sizes="44px" className="object-contain p-0.5" />}
                      </span>
                      <span>
                        {p.name_en}
                        {p.is_best_seller && <Star className="ms-1.5 inline size-3.5 fill-star text-star" aria-label="Best selling" />}
                        <span className="block font-arabic text-xs font-normal text-muted" dir="rtl">{p.name_ar}</span>
                      </span>
                    </Link>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: c?.brand_color }} />{c?.name_en}</span>
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-muted">{cat?.name_en ?? "—"}</td>
                  <td className="px-4 py-2.5 text-end font-semibold tabular-nums">{money(p.price, "en")}</td>
                  <td className="px-4 py-2.5 text-center"><Switch id={p.id} field="is_active" on={p.is_active} /></td>
                  <td className="px-4 py-2.5 text-center"><Switch id={p.id} field="in_stock" on={p.in_stock} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products?.length === 0 && <p className="p-10 text-center text-muted">No products found.</p>}
      </div>
    </div>
  );
}

function Switch({ id, field, on }: { id: string; field: string; on: boolean }) {
  return (
    <form action={toggleProduct}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={String(!on)} />
      <button
        role="switch"
        aria-checked={on}
        aria-label={field === "is_active" ? "Show on website" : "In stock"}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-brand-600" : "bg-line"}`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5.5" : "translate-x-0.5"}`} />
      </button>
    </form>
  );
}
