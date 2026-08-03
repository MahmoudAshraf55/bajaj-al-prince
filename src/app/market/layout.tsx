import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageContext";
import { getSiteLocale } from "@/lib/site-locale";

export const metadata: Metadata = {
  title: "Market | El Prince Bajaj — Genuine Parts & Motorcycles",
  description: "Browse genuine Bajaj motorcycles, spare parts, and accessories. Shop with confidence at El Prince Bajaj authorized service center.",
};

export default async function MarketLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getSiteLocale();

  return (
    <LanguageProvider scope="site" initialLanguage={locale.lang} initialDictionary={locale.dictionary}>
      {children}
    </LanguageProvider>
  );
}
