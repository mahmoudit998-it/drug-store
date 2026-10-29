import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getDictionary, hasLocale, tr } from "@/lib/i18n";
import { getSettings } from "@/lib/data";
import { waLink } from "@/lib/format";
import { WhatsAppIcon } from "@/components/site/icons";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).contact.title } : {};
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const s = await getSettings();
  const rows = [
    { icon: Phone, label: t.contact.phone, value: <a dir="ltr" href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:underline">{s.phone}</a> },
    { icon: Mail, label: t.contact.email, value: <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a> },
    { icon: MapPin, label: t.contact.address, value: tr(s, "address", lang) },
    { icon: Clock, label: t.contact.hours, value: tr(s, "working_hours", lang) },
  ];

  return (
    <div className="container-x py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.contact.title}</h1>
        <p className="mt-2 text-muted">{t.contact.subtitle}</p>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl bg-brand-800 p-8 text-white">
          <WhatsAppIcon className="size-12 text-[#25D366]" />
          <p dir="ltr" className="mt-5 text-start text-2xl font-extrabold">+{s.whatsapp.replace(/\D/g, "")}</p>
          <a href={waLink(s.whatsapp, t.wa.general)} target="_blank" rel="noopener" className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-6 font-semibold text-white hover:brightness-95">
            <WhatsAppIcon className="size-5" /> {t.contact.whatsapp}
          </a>
        </div>
        <dl className="divide-y divide-line rounded-3xl border border-line">
          {rows.map(({ icon: I, label, value }) => (
            <div key={label} className="flex items-start gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><I className="size-5" /></span>
              <div>
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
