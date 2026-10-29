// Writes supabase/seed.sql from scripts/seed-data.mjs. Run: node scripts/build-seed-sql.mjs
import fs from "node:fs/promises";
import { categories, companies, products, productSlug } from "./seed-data.mjs";

const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" || typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(",")}]::text[]`;

const lines = ["-- Demo data. Safe to re-run: clears catalog tables first.", "begin;", "delete from public.products;", "delete from public.companies;", "delete from public.categories;", "delete from public.banners;"];

categories.forEach((c, i) =>
  lines.push(`insert into public.categories (slug, name_en, name_ar, icon, sort_order) values (${q(c.slug)}, ${q(c.name_en)}, ${q(c.name_ar)}, ${q(c.icon)}, ${i});`)
);

companies.forEach((c, i) =>
  lines.push(
    `insert into public.companies (slug, name_en, name_ar, tagline_en, tagline_ar, description_en, description_ar, logo_url, cover_url, brand_color, phone, email, website, established_year, sort_order) values (${[
      c.slug, c.name_en, c.name_ar, c.tagline_en, c.tagline_ar, c.description_en, c.description_ar,
      `/seed/companies/${c.slug}-logo.webp`, `/seed/companies/${c.slug}-cover.webp`, c.color,
      `+971 6 5${String(30 + i).padStart(2, "0")} 1${i}00`, `info@${c.slug}.ae`, null, c.established_year, i,
    ].map(q).join(", ")});`
  )
);

// Products go in one compact insert; descriptions are composed in SQL afterwards.
const rows = [];
for (const c of companies) {
  for (const p of products[c.slug]) {
    const slug = productSlug(c, p);
    rows.push(`(${[c.slug, p.category, slug, p.name_en, p.name_ar, p.subtitle_en, p.subtitle_ar, p.ingredient, p.pack, p.price, p.compare ?? null, p.rating, p.reviews, !!p.rx, p.best ?? 0].map(q).join(",")})`);
  }
}
lines.push(
  `insert into public.products (company_id, category_id, slug, name_en, name_ar, subtitle_en, subtitle_ar, active_ingredient, pack_size, price, compare_at_price, image_url, rating, reviews_count, requires_prescription, is_best_seller, best_seller_order)
select co.id, ca.id, v.slug, v.name_en, v.name_ar, v.sub_en, v.sub_ar, v.ing, v.pack, v.price, v.compare, '/seed/products/' || v.slug || '.webp', v.rating, v.reviews, v.rx, v.best > 0, v.best
from (values
${rows.join(",\n")}
) as v(company, category, slug, name_en, name_ar, sub_en, sub_ar, ing, pack, price, compare, rating, reviews, rx, best)
join public.companies co on co.slug = v.company
join public.categories ca on ca.slug = v.category;`
);
lines.push(
  `update public.products p set
  description_en = p.name_en || ' by ' || c.name_en || '. ' || p.subtitle_en || '. Active ingredients: ' || p.active_ingredient || '. Pack size: ' || p.pack_size || '. Store in a cool, dry place away from direct sunlight and keep out of reach of children.',
  description_ar = p.name_ar || ' من ' || c.name_ar || '. ' || p.subtitle_ar || '. المكونات الفعالة: ' || p.active_ingredient || '. حجم العبوة: ' || p.pack_size || '. يحفظ في مكان بارد وجاف بعيدًا عن أشعة الشمس المباشرة وبعيدًا عن متناول الأطفال.'
from public.companies c where c.id = p.company_id;`
);

lines.push(
  `insert into public.banners (eyebrow_en, eyebrow_ar, title_en, title_ar, body_en, body_ar, bullets_en, bullets_ar, badge_en, badge_ar, button_text_en, button_text_ar, button_url, image_url) values (${[
    "Special offer", "عرض خاص",
    "Stock up on vitamins & daily essentials", "خزّن الفيتامينات والمستلزمات اليومية",
    "Wholesale and retail prices on trusted brands, delivered across the UAE from our Sharjah warehouse.",
    "أسعار جملة وتجزئة على علامات تجارية موثوقة، مع التوصيل لجميع أنحاء الإمارات من مستودعنا في الشارقة.",
  ].map(q).join(", ")}, ${arr(["Genuine products from licensed companies", "Wholesale prices for pharmacies", "Fast delivery across the UAE", "Order easily on WhatsApp"])}, ${arr(["منتجات أصلية من شركات مرخصة", "أسعار جملة للصيدليات", "توصيل سريع في جميع أنحاء الإمارات", "اطلب بسهولة عبر واتساب"])}, ${[
    "Up to 20% OFF", "خصم حتى 20%", "Shop offers", "تسوق العروض", "/products?sale=1", "/seed/offer-banner.webp",
  ].map(q).join(", ")});`
);

lines.push("commit;");
await fs.mkdir("supabase", { recursive: true });
await fs.writeFile("supabase/seed.sql", lines.join("\n") + "\n");
console.log(`Wrote supabase/seed.sql (${lines.length} statements)`);
