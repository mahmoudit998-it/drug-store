"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSession } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

// ---- form helpers -------------------------------------------------------
const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const req = (f: FormData, k: string, label: string) => {
  const v = str(f, k);
  if (!v) throw new UserError(`${label} is required.`);
  return v;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new UserError(`“${k.replace(/_/g, " ")}” must be a number.`);
  return n;
};
const bool = (f: FormData, k: string) => f.get(k) === "on";
const lines = (f: FormData, k: string) =>
  String(f.get(k) ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export const slugify = async (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `item-${Date.now().toString(36)}`;

class UserError extends Error {}

/** Runs a mutation and turns failures into form state instead of crashing the page. */
async function run(fn: () => Promise<FormState | void>): Promise<FormState> {
  try {
    return (await fn()) ?? { ok: "Saved." };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    // redirect() throws a control-flow error that must propagate
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    console.error(e);
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

function dbError(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new UserError("That slug/URL is already used — choose another.");
  if (error.code === "42501") throw new UserError("You don't have permission to do that.");
  throw new UserError(error.message);
}

const refreshSite = () => revalidatePath("/", "layout");

// ---- products -----------------------------------------------------------
export async function saveProduct(_: FormState, f: FormData): Promise<FormState> {
  return run(async () => {
    const { supabase, isAdmin, profile } = await requireSession();
    const id = str(f, "id");
    const name_en = req(f, "name_en", "English name");
    const companyId = isAdmin ? req(f, "company_id", "Company") : profile.company_id;
    const price = num(f, "price");
    if (price === null || price < 0) throw new UserError("Price is required.");
    const compare = num(f, "compare_at_price");
    if (compare !== null && compare <= price) throw new UserError("“Price before discount” must be higher than the price.");

    const row = {
      company_id: companyId,
      category_id: str(f, "category_id"),
      slug: str(f, "slug") ? await slugify(str(f, "slug")!) : await slugify(name_en),
      name_en,
      name_ar: req(f, "name_ar", "Arabic name"),
      subtitle_en: str(f, "subtitle_en"),
      subtitle_ar: str(f, "subtitle_ar"),
      description_en: str(f, "description_en"),
      description_ar: str(f, "description_ar"),
      active_ingredient: str(f, "active_ingredient"),
      pack_size: str(f, "pack_size"),
      price,
      compare_at_price: compare,
      image_url: str(f, "image_url"),
      rating: Math.min(5, Math.max(0, num(f, "rating") ?? 0)),
      reviews_count: Math.max(0, Math.round(num(f, "reviews_count") ?? 0)),
      requires_prescription: bool(f, "requires_prescription"),
      in_stock: bool(f, "in_stock"),
      is_active: bool(f, "is_active"),
    };

    const { error } = id
      ? await supabase.from("products").update(row).eq("id", id)
      : await supabase.from("products").insert(row);
    dbError(error);
    refreshSite();
    redirect(`/dashboard/products?saved=${encodeURIComponent(name_en)}`);
  });
}

export async function deleteProduct(f: FormData) {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("products").delete().eq("id", String(f.get("id")));
  if (error) throw new Error(error.message);
  refreshSite();
  redirect("/dashboard/products");
}

export async function toggleProduct(f: FormData) {
  const { supabase } = await requireSession();
  const field = String(f.get("field"));
  if (!["is_active", "in_stock"].includes(field)) return;
  await supabase.from("products").update({ [field]: f.get("value") === "true" }).eq("id", String(f.get("id")));
  refreshSite();
  revalidatePath("/dashboard/products");
}

// ---- best sellers (admin) ----------------------------------------------
export async function setBestSeller(f: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(f.get("id"));
  const on = f.get("value") === "true";
  let order = 0;
  if (on) {
    const { data } = await supabase.from("products").select("best_seller_order").eq("is_best_seller", true).order("best_seller_order", { ascending: false }).limit(1);
    order = (data?.[0]?.best_seller_order ?? 0) + 1;
  }
  await supabase.from("products").update({ is_best_seller: on, best_seller_order: order }).eq("id", id);
  refreshSite();
  revalidatePath("/dashboard", "layout");
}

export async function moveBestSeller(f: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(f.get("id"));
  const dir = f.get("dir") === "up" ? -1 : 1;
  const { data } = await supabase.from("products").select("id").eq("is_best_seller", true).order("best_seller_order");
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((pid, idx) => supabase.from("products").update({ best_seller_order: idx + 1 }).eq("id", pid)));
  refreshSite();
  revalidatePath("/dashboard/best-sellers");
}

// ---- companies ------------------------------------------------------------
export async function saveCompany(_: FormState, f: FormData): Promise<FormState> {
  return run(async () => {
    const { supabase, isAdmin, profile } = await requireSession();
    const id = str(f, "id");
    if (!isAdmin && id !== profile.company_id) throw new UserError("You can only edit your own company.");
    const name_en = req(f, "name_en", "English name");
    const row: Record<string, unknown> = {
      name_en,
      name_ar: req(f, "name_ar", "Arabic name"),
      tagline_en: str(f, "tagline_en"),
      tagline_ar: str(f, "tagline_ar"),
      description_en: str(f, "description_en"),
      description_ar: str(f, "description_ar"),
      logo_url: str(f, "logo_url"),
      cover_url: str(f, "cover_url"),
      brand_color: /^#[0-9a-f]{6}$/i.test(str(f, "brand_color") ?? "") ? str(f, "brand_color") : "#006E3A",
      phone: str(f, "phone"),
      email: str(f, "email"),
      website: str(f, "website"),
      established_year: num(f, "established_year"),
    };
    if (isAdmin) {
      row.slug = await slugify(str(f, "slug") ?? name_en);
      row.is_active = bool(f, "is_active");
      row.sort_order = num(f, "sort_order") ?? 0;
    }
    const { error } = id ? await supabase.from("companies").update(row).eq("id", id) : await supabase.from("companies").insert(row);
    dbError(error);
    refreshSite();
    if (isAdmin) redirect(`/dashboard/companies?saved=${encodeURIComponent(name_en)}`);
    revalidatePath("/dashboard", "layout");
    return { ok: "Company profile saved." };
  });
}

export async function deleteCompany(f: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("companies").delete().eq("id", String(f.get("id")));
  if (error) throw new Error(error.message);
  refreshSite();
  redirect("/dashboard/companies");
}

// ---- categories (admin) ------------------------------------------------------
export async function saveCategory(_: FormState, f: FormData): Promise<FormState> {
  return run(async () => {
    const { supabase } = await requireAdmin();
    const id = str(f, "id");
    const name_en = req(f, "name_en", "English name");
    const row = {
      name_en,
      name_ar: req(f, "name_ar", "Arabic name"),
      slug: await slugify(str(f, "slug") ?? name_en),
      icon: str(f, "icon") ?? "pill",
      sort_order: num(f, "sort_order") ?? 0,
    };
    const { error } = id ? await supabase.from("categories").update(row).eq("id", id) : await supabase.from("categories").insert(row);
    dbError(error);
    refreshSite();
    revalidatePath("/dashboard/categories");
    return { ok: id ? "Category updated." : "Category added." };
  });
}

export async function deleteCategory(f: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("categories").delete().eq("id", String(f.get("id")));
  refreshSite();
  revalidatePath("/dashboard/categories");
}

// ---- banners (admin) -----------------------------------------------------------
export async function saveBanner(_: FormState, f: FormData): Promise<FormState> {
  return run(async () => {
    const { supabase } = await requireAdmin();
    const id = str(f, "id");
    const row = {
      eyebrow_en: str(f, "eyebrow_en"),
      eyebrow_ar: str(f, "eyebrow_ar"),
      title_en: req(f, "title_en", "English title"),
      title_ar: req(f, "title_ar", "Arabic title"),
      body_en: str(f, "body_en"),
      body_ar: str(f, "body_ar"),
      bullets_en: lines(f, "bullets_en"),
      bullets_ar: lines(f, "bullets_ar"),
      badge_en: str(f, "badge_en"),
      badge_ar: str(f, "badge_ar"),
      button_text_en: str(f, "button_text_en"),
      button_text_ar: str(f, "button_text_ar"),
      button_url: str(f, "button_url"),
      image_url: str(f, "image_url"),
      is_active: bool(f, "is_active"),
      sort_order: num(f, "sort_order") ?? 0,
    };
    const { error } = id ? await supabase.from("banners").update(row).eq("id", id) : await supabase.from("banners").insert(row);
    dbError(error);
    refreshSite();
    redirect("/dashboard/banners?saved=1");
  });
}

export async function deleteBanner(f: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("banners").delete().eq("id", String(f.get("id")));
  refreshSite();
  redirect("/dashboard/banners");
}

// ---- settings (admin) ----------------------------------------------------------
export async function saveSettings(_: FormState, f: FormData): Promise<FormState> {
  return run(async () => {
    const { supabase } = await requireAdmin();
    const whatsapp = req(f, "whatsapp", "WhatsApp number").replace(/\D/g, "");
    if (whatsapp.length < 8) throw new UserError("WhatsApp number must include the country code, e.g. 9715XXXXXXXX.");
    const row = {
      site_name_en: req(f, "site_name_en", "Site name (English)"),
      site_name_ar: req(f, "site_name_ar", "Site name (Arabic)"),
      whatsapp,
      phone: req(f, "phone", "Phone"),
      email: req(f, "email", "Email"),
      address_en: req(f, "address_en", "Address (English)"),
      address_ar: req(f, "address_ar", "Address (Arabic)"),
      working_hours_en: req(f, "working_hours_en", "Working hours (English)"),
      working_hours_ar: req(f, "working_hours_ar", "Working hours (Arabic)"),
      free_delivery_min: num(f, "free_delivery_min") ?? 0,
      founded_year: num(f, "founded_year") ?? 2003,
      facebook_url: str(f, "facebook_url"),
      instagram_url: str(f, "instagram_url"),
      linkedin_url: str(f, "linkedin_url"),
    };
    const { error } = await supabase.from("settings").update(row).eq("id", 1);
    dbError(error);
    refreshSite();
    return { ok: "Settings saved — the website is updated." };
  });
}

// ---- users (admin, via the manage-users edge function) -------------------------
async function manageUsers(body: Record<string, string | null>) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.functions.invoke("manage-users", { body });
  if (error) {
    // Surface the function's own error message when it returned one
    const ctx = (error as { context?: Response }).context;
    const msg = ctx ? ((await ctx.json().catch(() => null)) as { error?: string } | null)?.error : null;
    throw new UserError(msg || error.message);
  }
  return data;
}

export async function createUser(_: FormState, f: FormData): Promise<FormState> {
  return run(async () => {
    const role = str(f, "role") === "admin" ? "admin" : "company";
    await manageUsers({
      action: "create",
      email: req(f, "email", "Email").toLowerCase(),
      password: req(f, "password", "Password"),
      full_name: str(f, "full_name"),
      role,
      company_id: role === "company" ? req(f, "company_id", "Company") : null,
    });
    revalidatePath("/dashboard/users");
    return { ok: "Account created. Share the email and password with the user." };
  });
}

export async function setUserPassword(_: FormState, f: FormData): Promise<FormState> {
  return run(async () => {
    await manageUsers({ action: "set_password", user_id: req(f, "user_id", "User"), password: req(f, "password", "Password") });
    return { ok: "Password updated." };
  });
}

export async function deleteUser(f: FormData) {
  await manageUsers({ action: "delete", user_id: String(f.get("user_id")) });
  revalidatePath("/dashboard/users");
}

// ---- newsletter ------------------------------------------------------------------
export async function deleteSubscriber(f: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("newsletter_subscribers").delete().eq("id", String(f.get("id")));
  revalidatePath("/dashboard/subscribers");
}

// ---- session -----------------------------------------------------------------------
export async function signOut() {
  const { supabase } = await requireSession();
  await supabase.auth.signOut();
  redirect("/login");
}
