export type StoreProduct = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  subtitle_en: string | null;
  subtitle_ar: string | null;
  pack_size: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  requires_prescription: boolean;
  in_stock: boolean;
};

export type StoreShelf = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  tagline_en: string | null;
  tagline_ar: string | null;
  logo_url: string | null;
  brand_color: string;
  products: StoreProduct[];
};

/** A product box flying from its shelf into the cart after the customer confirms it. */
export type Flight = { key: number; shelf: number; slot: number };
