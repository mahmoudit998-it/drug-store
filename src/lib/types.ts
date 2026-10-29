export type Settings = {
  site_name_en: string;
  site_name_ar: string;
  whatsapp: string;
  phone: string;
  email: string;
  address_en: string;
  address_ar: string;
  working_hours_en: string;
  working_hours_ar: string;
  free_delivery_min: number;
  founded_year: number;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  icon: string;
  sort_order: number;
};

export type Company = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  tagline_en: string | null;
  tagline_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  logo_url: string | null;
  cover_url: string | null;
  brand_color: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  established_year: number | null;
  is_active: boolean;
  sort_order: number;
};

export type Product = {
  id: string;
  company_id: string;
  category_id: string | null;
  slug: string;
  name_en: string;
  name_ar: string;
  subtitle_en: string | null;
  subtitle_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  active_ingredient: string | null;
  pack_size: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  rating: number;
  reviews_count: number;
  requires_prescription: boolean;
  in_stock: boolean;
  is_active: boolean;
  is_best_seller: boolean;
  best_seller_order: number;
};

export type ProductWithRefs = Product & {
  company: Pick<Company, "id" | "slug" | "name_en" | "name_ar" | "logo_url" | "brand_color">;
  category: Pick<Category, "id" | "slug" | "name_en" | "name_ar"> | null;
};

export type Banner = {
  id: string;
  eyebrow_en: string | null;
  eyebrow_ar: string | null;
  title_en: string;
  title_ar: string;
  body_en: string | null;
  body_ar: string | null;
  bullets_en: string[];
  bullets_ar: string[];
  badge_en: string | null;
  badge_ar: string | null;
  button_text_en: string | null;
  button_text_ar: string | null;
  button_url: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Profile = {
  id: string;
  role: "admin" | "company";
  company_id: string | null;
  full_name: string | null;
  email: string | null;
};
