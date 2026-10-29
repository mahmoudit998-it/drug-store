"use client";

import { useActionState } from "react";
import type { Company } from "@/lib/types";
import { saveCompany } from "@/app/(admin)/dashboard/actions";
import { Bilingual, Card, Field, FormMessage, ImageUpload, Submit, Text, Toggle, inputCls } from "./ui";

export function CompanyForm({ company: c, isAdmin, uploadFolder }: { company?: Company | null; isAdmin: boolean; uploadFolder: string }) {
  const [state, action] = useActionState(saveCompany, undefined);
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="space-y-6">
        <Card title="Company profile">
          <div className="space-y-4">
            <Bilingual name="name" label="Company name" en={c?.name_en} ar={c?.name_ar} required />
            <Bilingual name="tagline" label="Tagline" en={c?.tagline_en} ar={c?.tagline_ar} />
            <Bilingual name="description" label="About the company" en={c?.description_en} ar={c?.description_ar} textarea rows={5} />
          </div>
        </Card>
        <Card title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="phone" label="Phone" defaultValue={c?.phone} dir="ltr" />
            <Text name="email" label="Email" type="email" defaultValue={c?.email} />
            <Text name="website" label="Website" type="url" defaultValue={c?.website} placeholder="https://" />
            <Text name="established_year" label="Established (year)" type="number" defaultValue={c?.established_year} />
          </div>
        </Card>
        <Card title="Cover image">
          <ImageUpload name="cover_url" label="Wide banner shown on the company page" defaultValue={c?.cover_url} folder={uploadFolder} aspect="wide" hint="Recommended 2400 × 480 px." />
        </Card>
      </div>
      <div className="space-y-6">
        <Card title="Logo & colour">
          <div className="space-y-4">
            <ImageUpload name="logo_url" label="Logo" defaultValue={c?.logo_url} folder={uploadFolder} hint="Square, at least 400 × 400 px." />
            <Field label="Brand colour" hint="Used for the company name on product cards.">
              <input type="color" name="brand_color" defaultValue={c?.brand_color ?? "#006E3A"} className="h-10 w-20 cursor-pointer rounded-lg border border-line bg-white p-1" />
            </Field>
          </div>
        </Card>
        {isAdmin && (
          <Card title="Admin">
            <div className="space-y-3">
              <Toggle name="is_active" label="Show on website" defaultChecked={c?.is_active ?? true} hint="Hiding a company also hides its products." />
              <Text name="slug" label="URL slug" defaultValue={c?.slug} hint="Leave empty to generate from the name." />
              <Field label="Display order">
                <input name="sort_order" type="number" defaultValue={c?.sort_order ?? 0} className={inputCls} />
              </Field>
            </div>
          </Card>
        )}
        <div className="space-y-3 lg:sticky lg:top-6">
          <FormMessage state={state} />
          <Submit className="w-full">{c ? "Save changes" : "Create company"}</Submit>
        </div>
      </div>
    </form>
  );
}
