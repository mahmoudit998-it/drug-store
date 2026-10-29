import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  const { supabase, isAdmin, profile } = await requireSession();
  const [{ data: categories }, { data: companies }] = await Promise.all([
    supabase.from("categories").select("id, name_en").order("sort_order"),
    isAdmin ? supabase.from("companies").select("id, name_en").order("sort_order") : Promise.resolve({ data: null }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/products" className="text-sm text-muted hover:text-ink">← Products</Link>
        <h1 className="mt-1 text-2xl font-extrabold">New product</h1>
      </div>
      <ProductForm categories={categories ?? []} companies={companies} uploadFolder={isAdmin ? "products" : `companies/${profile.company_id}`} />
    </div>
  );
}
