import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import type { Company } from "@/lib/types";
import { CompanyForm } from "@/components/admin/company-form";
import { ConfirmButton } from "@/components/admin/ui";
import { deleteCompany } from "../../actions";

export const metadata = { title: "Edit company" };

export default async function EditCompany({ params }: PageProps<"/dashboard/companies/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle<Company>();
  if (!company) notFound();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/companies" className="text-sm text-muted hover:text-ink">← Companies</Link>
          <h1 className="mt-1 text-2xl font-extrabold">{company.name_en}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/products?company=${company.id}`} className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:bg-surface">Products</Link>
          <Link href={`/en/companies/${company.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:bg-surface">
            <ExternalLink className="size-4" /> View profile
          </Link>
          <form action={deleteCompany}>
            <input type="hidden" name="id" value={company.id} />
            <ConfirmButton message={`Delete “${company.name_en}”? All of its products and company accounts' access will be deleted too.`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50">
              <Trash2 className="size-4" /> Delete
            </ConfirmButton>
          </form>
        </div>
      </div>
      <CompanyForm company={company} isAdmin uploadFolder={`companies/${company.id}`} />
    </div>
  );
}
