import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Companies" };

export default async function CompaniesAdmin({ searchParams }: PageProps<"/dashboard/companies">) {
  const { supabase } = await requireAdmin();
  const { saved } = await searchParams;
  const { data: companies } = await supabase.from("companies").select("*, products(count), profiles(count)").order("sort_order");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Companies</h1>
          <p className="text-sm text-muted">Partner companies selling through the warehouse.</p>
        </div>
        <Link href="/dashboard/companies/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
          <Plus className="size-4" /> Add company
        </Link>
      </div>
      {typeof saved === "string" && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800"><CheckCircle2 className="size-4" /> “{saved}” saved.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {companies?.map((c) => (
          <Link key={c.id} href={`/dashboard/companies/${c.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-card">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-xl" style={{ background: c.brand_color }}>
              {c.logo_url && <Image src={c.logo_url} alt="" fill sizes="56px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{c.name_en}</span>
              <span className="block truncate font-arabic text-sm text-muted" dir="rtl">{c.name_ar}</span>
              <span className="mt-1 block text-xs text-muted">
                {c.products?.[0]?.count ?? 0} products · {c.profiles?.[0]?.count ?? 0} accounts
                {!c.is_active && <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">Hidden</span>}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
