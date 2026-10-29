import Image from "next/image";
import Link from "next/link";
import { Building2, EyeOff, Package, PackageX, Plus, Star } from "lucide-react";
import { requireSession } from "@/lib/auth";

export default async function Overview() {
  const { supabase, isAdmin, company, profile } = await requireSession();

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const products = () => {
    const q = supabase.from("products").select("id", { count: "exact", head: true });
    return isAdmin ? q : q.eq("company_id", profile.company_id!);
  };
  const [total, hidden, outOfStock, best, companies] = await Promise.all([
    count(products()),
    count(products().eq("is_active", false)),
    count(products().eq("in_stock", false)),
    count(products().eq("is_best_seller", true)),
    isAdmin ? count(supabase.from("companies").select("id", { count: "exact", head: true })) : Promise.resolve(0),
  ]);
  const { data: recent } = await (isAdmin
    ? supabase.from("products").select("id, name_en, image_url, updated_at, company:companies(name_en)").order("updated_at", { ascending: false }).limit(6)
    : supabase.from("products").select("id, name_en, image_url, updated_at, company:companies(name_en)").eq("company_id", profile.company_id!).order("updated_at", { ascending: false }).limit(6));

  const stats = [
    { label: "Products", value: total, icon: Package, href: "/dashboard/products" },
    { label: "Hidden from site", value: hidden, icon: EyeOff, href: "/dashboard/products?status=hidden" },
    { label: "Out of stock", value: outOfStock, icon: PackageX, href: "/dashboard/products?status=out" },
    isAdmin
      ? { label: "Companies", value: companies, icon: Building2, href: "/dashboard/companies" }
      : { label: "In Best Selling", value: best, icon: Star, href: "/dashboard/products" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Welcome{profile.full_name ? `, ${profile.full_name}` : ""}</h1>
          <p className="text-sm text-muted">{isAdmin ? "Manage the whole catalog, companies and website content." : `Manage ${company?.name_en}'s products and profile.`}</p>
        </div>
        <Link href="/dashboard/products/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
          <Plus className="size-4" /> Add product
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-card">
            <s.icon className="size-5 text-brand-600" />
            <p className="mt-3 text-3xl font-extrabold">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-white">
        <h2 className="border-b border-line px-5 py-4 font-bold">Recently updated</h2>
        <ul className="divide-y divide-line">
          {(recent ?? []).map((p) => {
            const c = p.company as unknown as { name_en: string } | null;
            return (
              <li key={p.id}>
                <Link href={`/dashboard/products/${p.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface">
                  <span className="relative size-10 shrink-0">{p.image_url && <Image src={p.image_url} alt="" fill sizes="40px" className="object-contain" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name_en}</span>
                    <span className="block text-xs text-muted">{c?.name_en}</span>
                  </span>
                  <span className="text-xs text-muted">{new Date(p.updated_at).toLocaleDateString("en-GB")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
