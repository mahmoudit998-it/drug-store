import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getCompanies, getProducts, getSettings } from "@/lib/data";
import { PharmacyStore } from "@/components/site/store/pharmacy-store";
import type { StoreShelf } from "@/components/site/store/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/store">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).store.title } : {};
}

export default async function StorePage({ params }: PageProps<"/[lang]/store">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [companies, products, settings] = await Promise.all([getCompanies(), getProducts(), getSettings()]);

  // One shelf per active company, holding only the fields the 3D store needs.
  const shelves: StoreShelf[] = companies
    .filter((c) => c.is_active)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name_en: c.name_en,
      name_ar: c.name_ar,
      tagline_en: c.tagline_en,
      tagline_ar: c.tagline_ar,
      logo_url: c.logo_url,
      brand_color: c.brand_color,
      products: products
        .filter((p) => p.company_id === c.id)
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          name_en: p.name_en,
          name_ar: p.name_ar,
          subtitle_en: p.subtitle_en,
          subtitle_ar: p.subtitle_ar,
          active_ingredient: p.active_ingredient,
          pack_size: p.pack_size,
          price: Number(p.price),
          compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
          image_url: p.image_url,
          requires_prescription: p.requires_prescription,
          in_stock: p.in_stock,
        })),
    }))
    .filter((s) => s.products.length > 0);

  return (
    <PharmacyStore lang={lang} t={getDictionary(lang)} shelves={shelves} whatsapp={settings.whatsapp} freeMin={Number(settings.free_delivery_min)} />
  );
}
