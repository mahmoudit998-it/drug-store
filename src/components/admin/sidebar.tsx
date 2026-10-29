"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, Image as ImageIcon, LayoutDashboard, Mail, Menu, Package, Settings, Star, Tags, Users, X } from "lucide-react";

const icons = { LayoutDashboard, Package, Building2, Tags, Star, ImageIcon, Settings, Users, Mail };
export type NavItem = { href: string; label: string; icon: keyof typeof icons };

export function Sidebar({ items, header, footer }: { items: NavItem[]; header: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {items.map((i) => {
        const Icon = icons[i.icon];
        const active = i.href === "/dashboard" ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-brand-700 text-white" : "text-ink hover:bg-brand-50"}`}
          >
            <Icon className="size-[18px]" strokeWidth={1.75} /> {i.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-lg hover:bg-surface" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        {header}
      </div>
      <aside className="fixed inset-y-0 start-0 hidden w-64 flex-col border-e border-line bg-white lg:flex">
        <div className="border-b border-line p-4">{header}</div>
        {nav}
        <div className="border-t border-line p-3">{footer}</div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col bg-white">
            <div className="flex items-center justify-between border-b border-line p-4">
              {header}
              <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-surface" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <div className="border-t border-line p-3">{footer}</div>
          </aside>
        </div>
      )}
    </>
  );
}
