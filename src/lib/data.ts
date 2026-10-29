import "server-only";
import { cache } from "react";
import { createPublicClient } from "./supabase/server";
import type { Banner, Category, Company, ProductWithRefs, Settings } from "./types";

const PRODUCT_SELECT =
  "*, company:companies!inner(id, slug, name_en, name_ar, logo_url, brand_color, is_active), category:categories(id, slug, name_en, name_ar)";

const db = () => createPublicClient();

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Failed to load ${what}: ${res.error.message}`);
  return res.data as T;
}

export const getSettings = cache(async (): Promise<Settings> => {
  return must(await db().from("settings").select("*").eq("id", 1).single(), "settings");
});

export const getCategories = cache(async (): Promise<Category[]> => {
  return must(await db().from("categories").select("*").order("sort_order"), "categories");
});

export type CompanyWithCount = Company & { product_count: number };

export const getCompanies = cache(async (): Promise<CompanyWithCount[]> => {
  const rows = must(
    await db().from("companies").select("*, products(count)").eq("products.is_active", true).order("sort_order"),
    "companies"
  ) as (Company & { products: { count: number }[] })[];
  return rows.map(({ products, ...c }) => ({ ...c, product_count: products?.[0]?.count ?? 0 }));
});

export const getCompany = cache(async (slug: string): Promise<Company | null> => {
  return must(await db().from("companies").select("*").eq("slug", slug).maybeSingle(), "company");
});

export type ProductFilters = {
  q?: string;
  category?: string;
  company?: string;
  sale?: boolean;
  sort?: string;
  companyId?: string;
  limit?: number;
  excludeId?: string;
};

export async function getProducts(f: ProductFilters = {}): Promise<ProductWithRefs[]> {
  let query = db().from("products").select(PRODUCT_SELECT).eq("is_active", true).eq("company.is_active", true);

  if (f.category) {
    const cat = (await getCategories()).find((c) => c.slug === f.category);
    if (!cat) return [];
    query = query.eq("category_id", cat.id);
  }
  if (f.company) query = query.eq("company.slug", f.company);
  if (f.companyId) query = query.eq("company_id", f.companyId);
  if (f.excludeId) query = query.neq("id", f.excludeId);
  if (f.sale) query = query.not("compare_at_price", "is", null);
  if (f.q) {
    // Strip characters that would break PostgREST's or() syntax
    const term = f.q.replace(/[%,()*\\]/g, " ").trim();
    if (term) {
      const like = `%${term}%`;
      const companyIds = (await getCompanies())
        .filter((c) => c.name_en.toLowerCase().includes(term.toLowerCase()) || c.name_ar.includes(term))
        .map((c) => c.id);
      const ors = ["name_en", "name_ar", "subtitle_en", "subtitle_ar", "active_ingredient"].map((col) => `${col}.ilike.${like}`);
      if (companyIds.length) ors.push(`company_id.in.(${companyIds.join(",")})`);
      query = query.or(ors.join(","));
    }
  }

  switch (f.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false }).order("reviews_count", { ascending: false });
      break;
    case "name":
      query = query.order("name_en");
      break;
    default:
      query = query.order("is_best_seller", { ascending: false }).order("reviews_count", { ascending: false });
  }
  if (f.limit) query = query.limit(f.limit);

  return must(await query, "products") as ProductWithRefs[];
}

export const getBestSellers = cache(async (): Promise<ProductWithRefs[]> => {
  const res = await db()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("company.is_active", true)
    .eq("is_best_seller", true)
    .order("best_seller_order")
    .limit(12);
  return must(res, "best sellers") as ProductWithRefs[];
});

export const getProduct = cache(async (slug: string): Promise<ProductWithRefs | null> => {
  const res = await db().from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("is_active", true).maybeSingle();
  return must(res, "product") as ProductWithRefs | null;
});

export const getActiveBanner = cache(async (): Promise<Banner | null> => {
  const res = await db().from("banners").select("*").eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  return must(res, "banner");
});

export const getMaxDiscount = cache(async (): Promise<number> => {
  const res = await db().from("products").select("price, compare_at_price").eq("is_active", true).not("compare_at_price", "is", null);
  const rows = must(res, "discounts") as { price: number; compare_at_price: number }[];
  return rows.reduce((m, r) => Math.max(m, Math.round((1 - r.price / r.compare_at_price) * 100)), 0);
});
