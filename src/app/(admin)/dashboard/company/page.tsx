import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireSession } from "@/lib/auth";
import type { Company } from "@/lib/types";
import { CompanyForm } from "@/components/admin/company-form";

export const metadata = { title: "Company profile" };

// A company account's own profile page (admins use /dashboard/companies instead)
export default async function MyCompany() {
  const { supabase, isAdmin, profile } = await requireSession();
  if (isAdmin) redirect("/dashboard/companies");
  const { data: company } = await supabase.from("companies").select("*").eq("id", profile.company_id!).single<Company>();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Company profile</h1>
          <p className="text-sm text-muted">This is what customers see on your company page.</p>
        </div>
        {company && (
          <Link href={`/en/companies/${company.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:bg-surface">
            <ExternalLink className="size-4" /> View profile
          </Link>
        )}
      </div>
      <CompanyForm company={company} isAdmin={false} uploadFolder={`companies/${profile.company_id}`} />
    </div>
  );
}
