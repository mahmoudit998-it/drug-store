import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import type { Product } from "@/lib/types";
import { ProductForm } from "@/components/admin/product-form";
import { ConfirmButton } from "@/components/admin/ui";
import { deleteProduct } from "../../actions";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: PageProps<"/dashboard/products/[id]">) {
  const { id } = await params;
  const { supabase, isAdmin, profile } = await requireSession();
  // RLS already limits company accounts to their own rows
  const { data: product } = await supabase.from("products").select("*").eq("id", id).maybeSingle<Product>();
  if (!product) notFound();
  const [{ data: categories }, { data: companies }] = await Promise.all([
    supabase.from("categories").select("id, name_en").order("sort_order"),
    isAdmin ? supabase.from("companies").select("id, name_en").order("sort_order") : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/products" className="text-sm text-muted hover:text-ink">← Products</Link>
          <h1 className="mt-1 text-2xl font-extrabold">{product.name_en}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/en/products/${product.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:bg-surface">
            <ExternalLink className="size-4" /> View on site
          </Link>
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={product.id} />
            <ConfirmButton message={`Delete “${product.name_en}”? This cannot be undone.`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50">
              <Trash2 className="size-4" /> Delete
            </ConfirmButton>
          </form>
        </div>
      </div>
      <ProductForm product={product} categories={categories ?? []} companies={companies} uploadFolder={isAdmin ? "products" : `companies/${profile.company_id}`} />
    </div>
  );
}
