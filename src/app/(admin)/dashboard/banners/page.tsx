import Link from "next/link";
import { CheckCircle2, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import type { Banner } from "@/lib/types";
import { BannerForm } from "@/components/admin/simple-forms";
import { ConfirmButton } from "@/components/admin/ui";
import { deleteBanner } from "../actions";

export const metadata = { title: "Offer banner" };

export default async function Banners({ searchParams }: PageProps<"/dashboard/banners">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const { data: banners } = await supabase.from("banners").select("*").order("sort_order").order("created_at").returns<Banner[]>();
  const editing = sp.new ? null : (banners?.find((b) => b.id === sp.id) ?? banners?.[0] ?? null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Offer banner</h1>
          <p className="text-sm text-muted">The large promotional section on the home page.</p>
        </div>
        <Link href="/dashboard/banners?new=1" className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:bg-surface">
          New banner
        </Link>
      </div>
      {sp.saved && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <CheckCircle2 className="size-4" /> Banner saved.
        </p>
      )}
      {(banners?.length ?? 0) > 1 && (
        <div className="flex flex-wrap gap-2">
          {banners!.map((b) => (
            <Link key={b.id} href={`/dashboard/banners?id=${b.id}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${editing?.id === b.id ? "bg-brand-700 text-white" : "border border-line bg-white"}`}>
              {b.title_en} {!b.is_active && "(hidden)"}
            </Link>
          ))}
        </div>
      )}
      <BannerForm key={editing?.id ?? "new"} banner={editing} />
      {editing && (
        <form action={deleteBanner}>
          <input type="hidden" name="id" value={editing.id} />
          <ConfirmButton message="Delete this banner?" className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline">
            <Trash2 className="size-4" /> Delete this banner
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
