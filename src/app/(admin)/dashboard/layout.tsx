import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { Sidebar, type NavItem } from "@/components/admin/sidebar";
import { signOut } from "./actions";

// Always render with the signed-in user's data
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, company, isAdmin } = await requireSession();

  const items: NavItem[] = isAdmin
    ? [
        { href: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
        { href: "/dashboard/products", label: "Products", icon: "Package" },
        { href: "/dashboard/companies", label: "Companies", icon: "Building2" },
        { href: "/dashboard/categories", label: "Categories", icon: "Tags" },
        { href: "/dashboard/best-sellers", label: "Best Selling", icon: "Star" },
        { href: "/dashboard/banners", label: "Offer banner", icon: "ImageIcon" },
        { href: "/dashboard/users", label: "Accounts", icon: "Users" },
        { href: "/dashboard/subscribers", label: "Newsletter", icon: "Mail" },
        { href: "/dashboard/settings", label: "Site settings", icon: "Settings" },
      ]
    : [
        { href: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
        { href: "/dashboard/products", label: "My products", icon: "Package" },
        { href: "/dashboard/company", label: "Company profile", icon: "Building2" },
      ];

  const header = (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <Image src="/brand/logo-mark.png" alt="" width={588} height={296} className="h-8 w-auto" />
      <span className="leading-tight">
        <span className="block text-sm font-extrabold text-brand-700">Dashboard</span>
        <span className="block text-[11px] text-muted">{isAdmin ? "Warehouse admin" : company?.name_en}</span>
      </span>
    </Link>
  );

  const footer = (
    <div className="space-y-1">
      <p className="truncate px-3 pb-1 text-xs text-muted" title={profile.email ?? ""}>{profile.email}</p>
      <Link href={company && !isAdmin ? `/en/companies/${company.slug}` : "/en"} target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface">
        <ExternalLink className="size-4" /> View website
      </Link>
      <form action={signOut}>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
          <LogOut className="size-4" /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div>
      <Sidebar items={items} header={header} footer={footer} />
      <div className="lg:ps-64">
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
