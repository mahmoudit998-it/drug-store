import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CompanyForm } from "@/components/admin/company-form";

export const metadata = { title: "New company" };

export default async function NewCompany() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/companies" className="text-sm text-muted hover:text-ink">← Companies</Link>
        <h1 className="mt-1 text-2xl font-extrabold">New company</h1>
      </div>
      <CompanyForm isAdmin uploadFolder="companies/new" />
    </div>
  );
}
