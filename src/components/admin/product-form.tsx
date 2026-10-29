"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Category, Product } from "@/lib/types";
import { saveProduct } from "@/app/(admin)/dashboard/actions";
import { Bilingual, Card, Field, FormMessage, ImageUpload, Submit, Text, Toggle, inputCls } from "./ui";

type Props = {
  product?: Product | null;
  categories: Pick<Category, "id" | "name_en">[];
  companies: { id: string; name_en: string }[] | null; // null = company account (fixed company)
  uploadFolder: string;
};

export function ProductForm({ product: p, categories, companies, uploadFolder }: Props) {
  const [state, action] = useActionState(saveProduct, undefined);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="space-y-6">
        <Card title="Basic information">
          <div className="space-y-4">
            <Bilingual name="name" label="Product name" en={p?.name_en} ar={p?.name_ar} required />
            <Bilingual name="subtitle" label="Short line under the name" en={p?.subtitle_en} ar={p?.subtitle_ar} hint="e.g. “Paracetamol 500mg” or “Immune & Bone Health”" />
            <Bilingual name="description" label="Description" en={p?.description_en} ar={p?.description_ar} textarea rows={5} />
          </div>
        </Card>
        <Card title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="active_ingredient" label="Active ingredients" defaultValue={p?.active_ingredient} />
            <Text name="pack_size" label="Pack size" defaultValue={p?.pack_size} placeholder="e.g. 24 Tablets, 100 ml" />
            {companies && (
              <Field label="Company *">
                <select name="company_id" required defaultValue={p?.company_id ?? ""} className={inputCls}>
                  <option value="" disabled>Choose a company…</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                </select>
              </Field>
            )}
            <Field label="Category">
              <select name="category_id" defaultValue={p?.category_id ?? ""} className={inputCls}>
                <option value="">— None —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
              </select>
            </Field>
            <Text name="slug" label="URL slug" defaultValue={p?.slug} hint="Leave empty to generate from the English name." />
          </div>
        </Card>
        <Card title="Pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="price" label="Retail price (AED)" type="number" step="0.01" defaultValue={p?.price} required />
            <Text name="compare_at_price" label="Price before discount (AED)" type="number" step="0.01" defaultValue={p?.compare_at_price} hint="Optional. Shows a strike-through price and “% OFF”." />
            <Text name="rating" label="Rating (0–5)" type="number" step="0.1" defaultValue={p?.rating ?? 4.5} />
            <Text name="reviews_count" label="Number of reviews" type="number" defaultValue={p?.reviews_count ?? 0} />
          </div>
          <p className="mt-3 text-xs text-muted">Wholesale prices are not shown on the website — customers ask for them on WhatsApp.</p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Image">
          <ImageUpload name="image_url" label="Product photo" defaultValue={p?.image_url} folder={uploadFolder} hint="Square image on a white or transparent background works best." />
        </Card>
        <Card title="Visibility">
          <div className="space-y-2">
            <Toggle name="is_active" label="Show on website" defaultChecked={p?.is_active ?? true} />
            <Toggle name="in_stock" label="In stock" defaultChecked={p?.in_stock ?? true} />
            <Toggle name="requires_prescription" label="Prescription required" defaultChecked={p?.requires_prescription} hint="Shows an Rx badge" />
          </div>
        </Card>
        <div className="space-y-3 lg:sticky lg:top-6">
          <FormMessage state={state} />
          <Submit className="w-full">{p ? "Save changes" : "Create product"}</Submit>
          <Link href="/dashboard/products" className="block text-center text-sm text-muted hover:text-ink">Cancel</Link>
        </div>
      </div>
    </form>
  );
}
