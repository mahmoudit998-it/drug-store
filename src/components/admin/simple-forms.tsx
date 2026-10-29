"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Banner, Category, Settings } from "@/lib/types";
import { categoryIconNames, CategoryIcon } from "@/components/site/icons";
import { createUser, saveBanner, saveCategory, saveSettings, setUserPassword } from "@/app/(admin)/dashboard/actions";
import { Bilingual, Card, Field, FormMessage, ImageUpload, Submit, Text, Toggle, inputCls } from "./ui";

export function CategoryForm({ category: c }: { category?: Category }) {
  const [state, action] = useActionState(saveCategory, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !c) ref.current?.reset();
  }, [state, c]);

  return (
    <form ref={ref} action={action} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_150px_90px_auto]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Text name="name_en" label="Name (English)" defaultValue={c?.name_en} required />
      <Text name="name_ar" label="Name (العربية)" defaultValue={c?.name_ar} required dir="rtl" />
      <Field label="Icon">
        <select name="icon" defaultValue={c?.icon ?? "pill"} className={inputCls}>
          {categoryIconNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Field>
      <Text name="sort_order" label="Order" type="number" defaultValue={c?.sort_order ?? 0} />
      <div className="flex items-center gap-2">
        {c && <CategoryIcon name={c.icon} className="size-6 text-brand-600" />}
        <Submit>{c ? "Save" : "Add"}</Submit>
      </div>
      {c && <input type="hidden" name="slug" value={c.slug} />}
      <div className="sm:col-span-5 empty:hidden">{state && <FormMessage state={state} />}</div>
    </form>
  );
}

export function BannerForm({ banner: b }: { banner?: Banner | null }) {
  const [state, action] = useActionState(saveBanner, undefined);
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {b && <input type="hidden" name="id" value={b.id} />}
      <div className="space-y-6">
        <Card title="Text">
          <div className="space-y-4">
            <Bilingual name="eyebrow" label="Small label above title" en={b?.eyebrow_en} ar={b?.eyebrow_ar} />
            <Bilingual name="title" label="Title" en={b?.title_en} ar={b?.title_ar} required />
            <Bilingual name="body" label="Text" en={b?.body_en} ar={b?.body_ar} textarea rows={3} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bullet points (English)" hint="One per line">
                <textarea name="bullets_en" rows={4} defaultValue={b?.bullets_en?.join("\n")} className={`${inputCls} h-auto py-2`} />
              </Field>
              <Field label="Bullet points (العربية)" hint="سطر لكل نقطة">
                <textarea name="bullets_ar" rows={4} dir="rtl" defaultValue={b?.bullets_ar?.join("\n")} className={`${inputCls} h-auto py-2 font-arabic`} />
              </Field>
            </div>
            <Bilingual name="badge" label="Round badge" en={b?.badge_en} ar={b?.badge_ar} hint="e.g. “Up to 20% OFF”" />
            <Bilingual name="button_text" label="Button text" en={b?.button_text_en} ar={b?.button_text_ar} />
            <Text name="button_url" label="Button link" defaultValue={b?.button_url} hint="Site paths like /products?sale=1 or /companies/nova-pharma get the language added automatically." />
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <Card title="Image">
          <ImageUpload name="image_url" label="Banner image" defaultValue={b?.image_url} folder="banners" aspect="square" hint="Transparent PNG/WebP, about 1000 × 460 px." />
        </Card>
        <Card>
          <div className="space-y-3">
            <Toggle name="is_active" label="Show on home page" defaultChecked={b?.is_active ?? true} />
            <Text name="sort_order" label="Order" type="number" defaultValue={b?.sort_order ?? 0} hint="The first active banner is shown." />
          </div>
        </Card>
        <FormMessage state={state} />
        <Submit className="w-full">{b ? "Save banner" : "Create banner"}</Submit>
      </div>
    </form>
  );
}

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const [state, action] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="space-y-6">
      <Card title="Store">
        <div className="space-y-4">
          <Bilingual name="site_name" label="Store name" en={s.site_name_en} ar={s.site_name_ar} required />
          <div className="grid gap-4 sm:grid-cols-3">
            <Text name="whatsapp" label="WhatsApp number (orders)" defaultValue={s.whatsapp} required dir="ltr" hint="With country code, digits only, e.g. 9715XXXXXXXX" />
            <Text name="free_delivery_min" label="Free delivery from (AED)" type="number" step="0.01" defaultValue={s.free_delivery_min} />
            <Text name="founded_year" label="Founded (year)" type="number" defaultValue={s.founded_year} />
          </div>
        </div>
      </Card>
      <Card title="Contact details">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="phone" label="Phone" defaultValue={s.phone} required dir="ltr" />
            <Text name="email" label="Email" type="email" defaultValue={s.email} required />
          </div>
          <Bilingual name="address" label="Address" en={s.address_en} ar={s.address_ar} required />
          <Bilingual name="working_hours" label="Working hours" en={s.working_hours_en} ar={s.working_hours_ar} required />
        </div>
      </Card>
      <Card title="Social media (optional)">
        <div className="grid gap-4 sm:grid-cols-3">
          <Text name="facebook_url" label="Facebook" type="url" defaultValue={s.facebook_url} />
          <Text name="instagram_url" label="Instagram" type="url" defaultValue={s.instagram_url} />
          <Text name="linkedin_url" label="LinkedIn" type="url" defaultValue={s.linkedin_url} />
        </div>
      </Card>
      <div className="flex items-center gap-4">
        <Submit>Save settings</Submit>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function CreateUserForm({ companies }: { companies: { id: string; name_en: string }[] }) {
  const [state, action] = useActionState(createUser, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Text name="full_name" label="Name" />
        <Text name="email" label="Email" type="email" required />
        <Text name="password" label="Password" required hint="At least 8 characters. Share it with the user securely." />
        <Field label="Account type">
          <select name="role" defaultValue="company" className={inputCls}>
            <option value="company">Company account (own products only)</option>
            <option value="admin">Warehouse admin (full access)</option>
          </select>
        </Field>
        <Field label="Company" hint="Required for company accounts.">
          <select name="company_id" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Submit>Create account</Submit>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(setUserPassword, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <input name="password" type="text" minLength={8} required placeholder="New password" aria-label="New password" className={`${inputCls} h-9 w-40`} />
      <Submit className="h-9 px-3">Set</Submit>
      {state && <FormMessage state={state} />}
    </form>
  );
}
