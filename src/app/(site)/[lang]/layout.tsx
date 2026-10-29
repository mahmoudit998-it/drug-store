import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import "../../globals.css";
import { dir, fmt, getDictionary, hasLocale, locales } from "@/lib/i18n";
import { getCategories, getSettings } from "@/lib/data";
import { CartProvider } from "@/components/site/cart";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Newsletter } from "@/components/site/newsletter";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const plexAr = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-plex-ar", display: "swap" });

// Pages are cached and refreshed every 5 minutes; dashboard edits revalidate immediately.
export const revalidate = 300;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang);
  const s = await getSettings();
  const name = lang === "ar" ? s.site_name_ar : s.site_name_en;
  return {
    title: { default: `${name} — ${t.hero.title1}, ${t.hero.title2}`, template: `%s | ${name}` },
    description: fmt(t.footer.about, { year: s.founded_year }),
    icons: { icon: "/brand/logo-mark.png" },
    alternates: { languages: { en: "/en", ar: "/ar" } },
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <html lang={lang} dir={dir(lang)} className={`${jakarta.variable} ${plexAr.variable}`}>
      <body className="min-h-dvh">
        <CartProvider>
          <Header lang={lang} t={t} settings={settings} categories={categories} />
          <main>{children}</main>
          <div className="container-x mt-14">
            <Newsletter t={t.newsletter} />
          </div>
          <Footer lang={lang} t={t} settings={settings} categories={categories} />
        </CartProvider>
      </body>
    </html>
  );
}
