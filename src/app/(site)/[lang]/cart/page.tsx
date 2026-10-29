import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getSettings } from "@/lib/data";
import { CartView } from "@/components/site/cart-view";

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).cart.title, robots: { index: false } } : {};
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const settings = await getSettings();
  return (
    <div className="container-x py-10">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t.cart.title}</h1>
      <CartView lang={lang} t={t} whatsapp={settings.whatsapp} freeMin={Number(settings.free_delivery_min)} />
    </div>
  );
}
