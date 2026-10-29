import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { fmt, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { waLink } from "@/lib/format";
import type { Category, Settings } from "@/lib/types";
import { WhatsAppIcon } from "./icons";

export function Footer({ lang, t, settings, categories }: { lang: Locale; t: Dictionary; settings: Settings; categories: Category[] }) {
  const L = (p: string) => `/${lang}${p}`;
  const col = "mb-4 text-[15px] font-bold";
  const link = "text-sm text-white/75 hover:text-white";
  return (
    <footer className="mt-10 bg-brand-900 text-white">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr]">
        <div>
          <div className="mb-4 inline-flex items-center gap-3 rounded-xl bg-white p-2 pe-4">
            <Image src="/brand/logo-mark.png" alt="" width={588} height={296} className="h-10 w-auto" />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-extrabold text-brand-700">{lang === "ar" ? "مستودع الشارقة" : "SHARJAH"}</span>
              <span className="text-[10px] font-semibold tracking-[0.16em] text-brand-600">{lang === "ar" ? "للأدوية ذ.م.م" : "DRUG STORE L.L.C."}</span>
            </span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-white/75">{fmt(t.footer.about, { year: settings.founded_year })}</p>
        </div>
        <div>
          <p className={col}>{t.footer.quick}</p>
          <ul className="space-y-2.5">
            <li><Link className={link} href={L("/about")}>{t.nav.about}</Link></li>
            <li><Link className={link} href={L("/products")}>{t.nav.products}</Link></li>
            <li><Link className={link} href={L("/companies")}>{t.nav.companies}</Link></li>
            <li><Link className={link} href={L("/products?sale=1")}>{t.nav.offers}</Link></li>
            <li><Link className={link} href={L("/contact")}>{t.nav.contact}</Link></li>
          </ul>
        </div>
        <div>
          <p className={col}>{t.footer.service}</p>
          <ul className="space-y-2.5">
            <li><Link className={link} href={L("/cart")}>{t.footer.howToOrder}</Link></li>
            <li><a className={link} target="_blank" rel="noopener" href={waLink(settings.whatsapp, t.wa.general)}>{t.footer.wholesale}</a></li>
            <li><a className={link} target="_blank" rel="noopener" href={waLink(settings.whatsapp, t.wa.prescription)}>{t.footer.prescription}</a></li>
            <li><Link className={link} href="/login">{t.footer.staff}</Link></li>
          </ul>
        </div>
        <div>
          <p className={col}>{t.footer.categories}</p>
          <ul className="space-y-2.5">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link className={link} href={L(`/products?category=${c.slug}`)}>{tr(c, "name", lang)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className={col}>{t.footer.help}</p>
          <ul className="space-y-3 text-sm text-white/85">
            <li>
              <a href={waLink(settings.whatsapp, t.wa.general)} target="_blank" rel="noopener" className="flex items-center gap-2.5 hover:text-white">
                <WhatsAppIcon className="size-4 text-[#25D366]" /> <span dir="ltr">+{settings.whatsapp.replace(/\D/g, "")}</span>
              </a>
            </li>
            <li className="flex items-center gap-2.5"><Phone className="size-4" /> <a href={`tel:${settings.phone.replace(/\s/g, "")}`} dir="ltr" className="hover:text-white">{settings.phone}</a></li>
            <li className="flex items-center gap-2.5"><Mail className="size-4" /> <a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a></li>
            <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0" /> {tr(settings, "address", lang)}</li>
            <li className="flex items-start gap-2.5"><Clock className="mt-0.5 size-4 shrink-0" /> {tr(settings, "working_hours", lang)}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-5 text-[13px] text-white/60">{fmt(t.footer.rights, { year: new Date().getFullYear() })}</div>
      </div>
    </footer>
  );
}
